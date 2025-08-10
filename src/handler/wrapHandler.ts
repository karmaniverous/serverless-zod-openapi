import middy from '@middy/core';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpMultipartBodyParser from '@middy/http-multipart-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { get } from 'radash';
import type { z } from 'zod';
import { z as zod } from 'zod';

import { globalExposedEnvKeys } from '@/serverless/stages/global';
import type { GlobalParams } from '@/serverless/stages/globalSchema';
import { globalParamSchema } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';
import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import { detectSecurityContext } from './detectSecurityContext';
import type { Handler, HandlerReturn, InferEvent, ParamUnion } from './Handler';
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { wrapSerializer } from './wrapSerializer';

/**
 * Options for wrapHandler. envKeys specify additional param keys
 * (beyond those globally exposed) that should be parsed and delivered
 * to the handler as typed environment variables.
 */
export type WrapHandlerOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
  Keys extends readonly (keyof (GlobalParams & StageParams))[],
> = {
  contentType?: string;
  envKeys?: Keys;
} & HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger> &
  Loggable<Logger>;

/** runtime schema that covers global + stage (adds STAGE etc.) */
const combinedParamSchema = globalParamSchema.extend({
  STAGE: zod.string(),
});

export const wrapHandler = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
  Keys extends readonly (keyof (GlobalParams & StageParams))[],
>(
  handler: Handler<EventSchema, ResponseSchema, Keys, Logger>,
  options?: WrapHandlerOptions<EventSchema, ResponseSchema, Logger, Keys>,
) =>
  middy(async (event: APIGatewayProxyEvent, context: Context) => {
    const { logger = console as unknown as Logger, envKeys } =
      options ??
      ({} as WrapHandlerOptions<EventSchema, ResponseSchema, Logger, Keys>);

    // HEAD requests should return immediately without further processing
    if (get(event, 'httpMethod') === 'HEAD') return {};

    // global + function-specific keys (typed as ParamUnion keys)
    const keys = new Set<keyof ParamUnion>([
      ...(globalExposedEnvKeys as readonly (keyof GlobalParams)[]),
      ...((envKeys ?? []) as unknown as readonly (keyof ParamUnion)[]),
    ]);

    const envSchema = combinedParamSchema.pick(
      Object.fromEntries([...keys].map((k) => [k, true])) as Record<
        string,
        true
      >,
    );

    // exact Pick by Keys
    const env = envSchema.parse(process.env) as unknown as Pick<
      ParamUnion,
      Keys[number]
    >;

    const securityContext = detectSecurityContext(event);
    const typedEvent = event as unknown as InferEvent<EventSchema>;
    const result = await handler(typedEvent, context, {
      env,
      logger,
      securityContext,
    });

    return result as Awaited<HandlerReturn<ResponseSchema>>;
  })
    .use(httpEventNormalizer())
    .use(httpHeaderNormalizer())
    .use(httpMultipartBodyParser())
    .use(httpJsonBodyParser())
    // don’t pass type args; let inference flow
    .use(httpZodValidator(options ?? ({} as never)))
    .use(
      httpErrorHandler({
        fallbackMessage: 'Non-HTTP server error. See CloudWatch for more info.',
      }),
    )
    .use(
      httpCors({
        credentials: true,
        getOrigin: (o) => o,
      }),
    )
    .use(
      httpResponseSerializer({
        serializers: [
          {
            regex: /^application\/json$/,
            serializer: wrapSerializer(({ body }) => JSON.stringify(body), {
              label: 'application/json',
              logger: (options?.logger ?? console) as Console,
            }),
          },
        ],
        defaultContentType: options?.contentType ?? 'application/json',
      }),
    );

