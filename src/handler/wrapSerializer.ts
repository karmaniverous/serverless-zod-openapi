import type HttpResponseSerializer from '@middy/http-response-serializer';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

type Serializer = NonNullable<
  Parameters<typeof HttpResponseSerializer>[0]
>['serializers'][number]['serializer'];

interface WrapSerializerOptions {
  label?: string;
}

export const wrapSerializer =
  <Logger extends ConsoleLogger>(
    serializer: Serializer,
    {
      label = 'serializer',
      logger = console as unknown as Logger,
    }: WrapSerializerOptions & Loggable<Logger> = {},
  ): Serializer =>
  (unserialized: unknown) => {
    logger.debug(`serializing ${label} response`);

    logger.debug('unserialized response', { unserialized });

    const serialized = serializer(unserialized);

    logger.debug('serialized response', { serialized });

    return serialized;
  };
