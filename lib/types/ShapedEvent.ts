import type { APIGatewayProxyEvent } from 'aws-lambda';
import type z from 'zod';

import type { Merge } from './Merge';

export type ShapedEvent<EventSchema extends z.ZodType | undefined> =
  EventSchema extends z.ZodType
    ? Merge<APIGatewayProxyEvent, z.output<EventSchema>>
    : APIGatewayProxyEvent;
