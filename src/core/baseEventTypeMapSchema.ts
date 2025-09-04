/**
 * baseEventTypeMapSchema
 * - Schema-first companion to BaseEventTypeMap.
 * - Ensures z.infer<typeof baseEventTypeMapSchema> === BaseEventTypeMap.
 *
 * @remarks
 * Consumers typically extend this schema when creating an App to add
 * project‑local event tokens (e.g., 'step').
 * Only tokens listed in the app’s `httpEventTypeTokens` are treated as HTTP at runtime.
 */
import type {
  ALBEvent,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  CloudFrontRequestEvent,
  CloudWatchLogsEvent,
  CognitoUserPoolTriggerEvent,
  DynamoDBStreamEvent,
  EventBridgeEvent,
  FirehoseTransformationEvent,
  KinesisStreamEvent,
  S3Event,
  SESEvent,
  SNSEvent,
  SQSEvent,
} from 'aws-lambda';
import { z } from 'zod';

export const baseEventTypeMapSchema = z.object({
  rest: z.custom<APIGatewayProxyEvent>(),
  http: z.custom<APIGatewayProxyEventV2>(),
  alb: z.custom<ALBEvent>(),
  sqs: z.custom<SQSEvent>(),
  sns: z.custom<SNSEvent>(),
  s3: z.custom<S3Event>(),
  dynamodb: z.custom<DynamoDBStreamEvent>(),
  kinesis: z.custom<KinesisStreamEvent>(),
  eventbridge: z.custom<EventBridgeEvent<string, unknown>>(),
  'cloudwatch-logs': z.custom<CloudWatchLogsEvent>(),
  ses: z.custom<SESEvent>(),
  cloudfront: z.custom<CloudFrontRequestEvent>(),
  firehose: z.custom<FirehoseTransformationEvent>(),
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Upstream AWS types mark this as deprecated; we retain the token for compatibility with existing apps.
  'cognito-userpool': z.custom<CognitoUserPoolTriggerEvent>(),
});

/** Canonical base event map type (schema‑first). Extend the schema in your App. */
export type BaseEventTypeMap = z.infer<typeof baseEventTypeMapSchema>;
// Notes:
// - This list intentionally includes widely used, generic AWS events.
// - Apps can extend the schema with custom or specialized tokens:
//     const EventMap = baseEventTypeMapSchema.extend({ step: z.custom<MyStepEvent>() })
// - Only tokens listed in your App's httpEventTypeTokens are treated as HTTP by the runtime.
