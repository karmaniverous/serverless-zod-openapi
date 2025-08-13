/**
 * Makes specified properties of `T` optional.
 *
 * @typeParam T - The type to make properties optional.
 * @typeParam U - The properties to make optional.
 *
 * @category Utilities
 */
export type MakeOptional<T extends object, U extends keyof T> = {
  [P in keyof T as P extends U ? never : P]: T[P];
} & Partial<Pick<T, U>>;
