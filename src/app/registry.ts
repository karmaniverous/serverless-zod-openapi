import type { z } from 'zod';

import { handlerFactory } from '@/src/app/handlerFactory';
import type { ZodObj } from '@/src/app/types';
import type { EnvSchemaNode } from '@/src/config/defineAppConfig';
import type { EnvAttached } from '@/src/handler/defineFunctionConfig';
import { ENV_CONFIG } from '@/src/handler/defineFunctionConfig';
import type { BaseOperation } from '@/src/openapi/types';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';
import type { HttpContext } from '@/src/types/HttpContext';

type RegistryEntry = {
  slug: string;
  functionName: string;
  eventType: string;
  method?: MethodKey;
  basePath?: string;
  httpContexts?: readonly HttpContext[];
  contentType?: string;
  fnEnvKeys?: readonly PropertyKey[];
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
  openapiBaseOperation?: BaseOperation;
  serverlessExtras?: unknown;
  callerModuleUrl: string;
  endpointsRootAbs: string;
  brandedConfig: Record<string, unknown>;
};

export const createRegistry = <
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
>(deps: {
  httpEventTypeTokens: readonly string[];
  env: {
    global: EnvSchemaNode<GlobalParamsSchema>;
    stage: EnvSchemaNode<StageParamsSchema>;
  };
}) => {
  const map = new Map<string, RegistryEntry>();

  return {
    defineFunction<
      EventType extends Extract<
        keyof z.infer<EventTypeMapSchema>,
        string
      >,
      EventSchema extends z.ZodType | undefined,
      ResponseSchema extends z.ZodType | undefined,
    >(options: {
      slug: string;
      functionName: string;
      eventType: EventType;
      method?: MethodKey;
      basePath?: string;
      httpContexts?: readonly HttpContext[];
      contentType?: string;
      eventSchema?: EventSchema;
      responseSchema?: ResponseSchema;
      fnEnvKeys?: readonly (keyof (z.infer<GlobalParamsSchema> &
        z.infer<StageParamsSchema>))[];
      callerModuleUrl: string;
      endpointsRootAbs: string;
    }) {
      const slug = options.slug;
      if (map.has(slug)) {
        const other = map.get(slug)!;
        throw new Error(
          `Duplicate function slug "${slug}". Existing: ${other.callerModuleUrl}. New: ${options.callerModuleUrl}. Provide a custom slug to disambiguate.`,
        );
      }

      const brandedConfig = {
        functionName: options.functionName,
        eventType: options.eventType as string,
        ...(options.method ? { method: options.method } : {}),
        ...(options.basePath ? { basePath: options.basePath } : {}),
        ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        ...(options.fnEnvKeys
          ? { fnEnvKeys: options.fnEnvKeys as readonly PropertyKey[] }
          : {}),
        ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
        ...(options.responseSchema
          ? { responseSchema: options.responseSchema }
          : {}),
        [ENV_CONFIG]: {
          global: deps.env.global,
          stage: deps.env.stage,
        } as {
          global: EnvSchemaNode<GlobalParamsSchema>;
          stage: EnvSchemaNode<StageParamsSchema>;
        },
      } as Record<string, unknown>;

      map.set(slug, {
        slug,
        functionName: options.functionName,
        eventType: options.eventType as string,
        ...(options.method ? { method: options.method } : {}),
        ...(options.basePath ? { basePath: options.basePath } : {}),
        ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        ...(options.fnEnvKeys
          ? { fnEnvKeys: options.fnEnvKeys as readonly PropertyKey[] }
          : {}),
        ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
        ...(options.responseSchema
          ? { responseSchema: options.responseSchema }
          : {}),
        callerModuleUrl: options.callerModuleUrl,
        endpointsRootAbs: options.endpointsRootAbs,
        brandedConfig,
      });

      return {
        handler: (
          business: Handler<
            EventSchema,
            ResponseSchema,
            (z.infer<EventTypeMapSchema> & BaseEventTypeMap)[EventType]
          >,
        ) => {
          type GlobalParams = z.infer<GlobalParamsSchema>;
          type StageParams = z.infer<StageParamsSchema>;
          type EventTypeMapResolved = z.infer<EventTypeMapSchema> &
            BaseEventTypeMap;
          type FC = FunctionConfig<
            EventSchema,
            ResponseSchema,
            GlobalParams,
            StageParams,
            EventTypeMapResolved,
            EventType
          > &
            EnvAttached<GlobalParamsSchema, StageParamsSchema>;

          const fnConfig = brandedConfig as unknown as FC;
          const make = handlerFactory<
            GlobalParamsSchema,
            StageParamsSchema,
            EventTypeMapResolved,
            EventType,
            EventSchema,
            ResponseSchema
          >(deps.httpEventTypeTokens);
          return make(fnConfig, business);
        },
        openapi: (baseOperation: BaseOperation) => {
          const r = map.get(slug)!;
          r.openapiBaseOperation = baseOperation;
        },
        serverless: (extras: unknown) => {
          const r = map.get(slug)!;
          r.serverlessExtras = extras;
        },
      };
    },
    values() {
      return map.values();
    },
  };
};
