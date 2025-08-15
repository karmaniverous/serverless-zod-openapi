// Required keys for a single object type U
type RequiredKeys<U extends Record<PropertyKey, unknown>> = {
  [K in keyof U]-?: {} extends Pick<U, K> ? never : K;
}[keyof U];

// Union of required keys across (possibly union) T
type RequiredKeysUnion<T extends Record<PropertyKey, unknown>> =
  T extends unknown ? RequiredKeys<T> : never;

// If T has no required members across all union constituents, return T | undefined; else T
export type Optionalize<T extends Record<PropertyKey, unknown>> = [
  RequiredKeysUnion<T>,
] extends [never]
  ? T | undefined
  : T;
