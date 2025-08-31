import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  SQSEvent,
} from 'aws-lambda';

export interface BaseEventTypeMap {
  rest: APIGatewayProxyEvent;
  http: APIGatewayProxyEventV2;
  sqs: SQSEvent;
}
