import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the app root folder. */
export const APP_ROOT = dirname(fileURLToPath(import.meta.url));
