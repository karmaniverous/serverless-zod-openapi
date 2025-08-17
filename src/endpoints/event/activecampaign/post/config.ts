/**
 * REQUIREMENTS ADDRESSED
 * - HTTP config declares APIGatewayProxyEvent as the EventType.
 * - Include eventSchema & responseSchema.
 * - No casts; thread GlobalParams & StageParams for env key typing.
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';

import { makeFunctionConfig } from '@@/lib/handler/makeFunctionConfig';
import type { globalParamsSchema } from '@@/src/config/global';
import type { stageParamsSchema } from '@@/src/config/stage';

export const eventSchema = undefined;
export const responseSchema = z.string();

export const functionConfig = makeFunctionConfig<
  APIGatewayProxyEvent,
  typeof eventSchema,
  typeof responseSchema,
  typeof globalParamsSchema,
  typeof stageParamsSchema
>({
  functionName: 'activecampaign_post',
  contentType: 'application/json',
  httpContexts: ['public'],
  method: 'post',
  basePath: 'event/activecampaign',
  eventSchema,
  responseSchema,
});
