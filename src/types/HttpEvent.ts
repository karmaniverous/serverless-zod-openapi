import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

export type HttpEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;
