import type HttpResponseSerializer from '@middy/http-response-serializer';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

type Serializer = NonNullable<
  Parameters<typeof HttpResponseSerializer>[0]
>['serializers'][number]['serializer'];

type WrapSerializerOptions<Logger extends ConsoleLogger> = {
  label?: string;
} & Loggable<Logger>;

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
