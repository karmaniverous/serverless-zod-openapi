import { join } from 'node:path';

import { toPosixPath } from '@karmaniverous/smoz';
import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';

export const eventSchema = z.any();
export const responseSchema = z.void();

type FnApi = {
  handler: <T>(
    impl: (e: unknown) => Promise<T> | T,
  ) => (...args: unknown[]) => Promise<T>;
  serverless: (extras: unknown) => void;
};

export const fn = app.defineFunction({
  eventType: 'sqs',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: toPosixPath(join(APP_ROOT_ABS, 'functions', 'sqs')),
}) as unknown as FnApi;
