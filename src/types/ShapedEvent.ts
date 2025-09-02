import type { APIGatewayProxyEvent } from 'aws-lambda';
import type z from 'zod';

import type { Merge } from './Merge';

/**
 * Alternative “shaped event” helper used by some tests/adapters.
 *
 * When a Zod `EventSchema` is present, overlay its output type onto
 * APIGatewayProxyEvent; otherwise keep the base event type.
 *
 * @typeParam EventSchema - optional Zod schema
 * @remarks
 * Most business handlers should use the generic {@link import('./Handler').ShapedEvent}
 * derived via the `wrapHandler` generics. This helper remains for scenarios where
 * a fixed APIGW v1 event is desirable.
 */
export type ShapedEvent<EventSchema extends z.ZodType | undefined> =
  EventSchema extends z.ZodType
    ? Merge<APIGatewayProxyEvent, z.output<EventSchema>>    : APIGatewayProxyEvent;
