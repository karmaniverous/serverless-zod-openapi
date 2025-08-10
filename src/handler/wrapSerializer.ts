import type HttpResponseSerializer from '@middy/http-response-serializer';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

/**
 * The type of the serializer function.
 */
type Serializer = NonNullable<
  Parameters<typeof HttpResponseSerializer>[0]
>['serializers'][number]['serializer'];

/**
 * The options for the `wrapSerializer` function.
 */
type WrapSerializerOptions<Logger extends ConsoleLogger> = {
  /**
   * The label to use when logging.
   */
  label?: string;
} & Loggable<Logger>;

/**
 * Wraps a serializer function with logging.
 *
 * @param serializer The serializer function to wrap.
 * @param options The options for the wrapper.
 * @returns The wrapped serializer function.
 */
export const wrapSerializer = <Logger extends ConsoleLogger>(
  serializer: Serializer,
  options: WrapSerializerOptions<Logger> = {},
): Serializer => {
  const { label = 'serializer', logger = console as unknown as Logger } =
    options;

  return (unserialized: unknown) => {
    logger.debug(`serializing ${label} response`);

    logger.debug('unserialized response', { unserialized });

    const serialized = serializer(unserialized);

    logger.debug('serialized response', { serialized });

    return serialized;
  };
};