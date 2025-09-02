import type { ZodObject, ZodRawShape } from 'zod';

/**
 * Convenience alias for App generics.
 *
 * @remarks Use this to express “any Zod object schema” in generic parameters.
 */
export type ZodObj = ZodObject<ZodRawShape>;
