/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import { makeWrapHandler } from '@@/src';
import { loadEnvConfig } from '@@/stack/config/loadEnvConfig';

import { functionConfig } from './config';
export const handler = makeWrapHandler(functionConfig, async () => 'Ok', loadEnvConfig);