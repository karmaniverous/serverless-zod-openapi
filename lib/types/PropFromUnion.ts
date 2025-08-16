export type PropFromUnion<U, K extends PropertyKey> = Extract<
  U,
  Record<K, unknown>
>[K];
