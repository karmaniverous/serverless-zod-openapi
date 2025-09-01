/**
 * baseEventTypeMapSchema
 * - Schema-first companion to BaseEventTypeMap.
 * - Ensures z.infer<typeof baseEventTypeMapSchema> === BaseEventTypeMap.
 */
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  SQSEvent,
} from 'aws-lambda';
import { z } from 'zod';

export const baseEventTypeMapSchema = z.object({
  rest: z.custom<APIGatewayProxyEvent>(),
  http: z.custom<APIGatewayProxyEventV2>(),
  sqs: z.custom<SQSEvent>(),
});

export type BaseEventTypeMapFromSchema = z.infer<typeof baseEventTypeMapSchema>;
// Type-level assertion (no runtime):
//   BaseEventTypeMapFromSchema should match BaseEventTypeMap (defined elsewhere).
// This file purposefully does not import BaseEventTypeMap to avoid circular deps;
// consumers can assert equality at usage sites if desired.
