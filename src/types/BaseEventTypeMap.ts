import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  SQSEvent,
} from 'aws-lambda';

/**
 * Base event type map understood by SMOZ.
 * @category Public API
 * @category Types
 *
 * @remarks You can extend this map in your app (e.g., add 'step').
 */export interface BaseEventTypeMap {
  rest: APIGatewayProxyEvent;
  http: APIGatewayProxyEventV2;
  sqs: SQSEvent;
}