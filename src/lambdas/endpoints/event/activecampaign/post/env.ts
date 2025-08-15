import type { AllParamsKeys } from '@@/src/serverless/config/stages';

/**
 * Additional config keys needed by this function.  Keys declared here
 * will be exposed only to this function; globally exposed keys remain.
 */
export const fnEnvKeys = [] as const satisfies readonly AllParamsKeys[];
