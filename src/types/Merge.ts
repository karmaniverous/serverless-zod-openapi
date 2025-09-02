/**
 * Merge two object types with right‑hand precedence.
 *
 * @typeParam T - left/base type
 * @typeParam U - right/override type
 *
 * @example
 * type A = { x: number; y: string };
 * type B = { y: boolean; z: Date };
 * // => { x: number; y: boolean; z: Date }
 * type R = Merge<A, B>;
 */
export type Merge<T, U> = Omit<T, keyof U> & U;