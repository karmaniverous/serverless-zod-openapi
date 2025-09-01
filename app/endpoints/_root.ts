import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the endpoints root folder. */
export const ENDPOINTS_ROOT_ABS = dirname(fileURLToPath(import.meta.url));
