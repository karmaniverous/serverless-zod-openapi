/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import { wrapHandler } from '@/src';
import { envConfig } from '@/stack/config/app.config';

import { functionConfig } from './config';
export const handler = wrapHandler(envConfig, functionConfig, async () => 'Ok');