/**
 * REQUIREMENTS ADDRESSED
 * - Provide a minimal generic Lambda event shape that is compatible with
 *   common authoring patterns. Zod schemas will refine this via deep override.
 */
export type LambdaEvent = Record<string, unknown>;
