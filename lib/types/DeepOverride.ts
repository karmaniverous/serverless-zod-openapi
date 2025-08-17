/* eslint-disable @typescript-eslint/consistent-type-definitions */

/**
 * DeepOverride
 * -----------
 * For two object types T (base) and U (override), produce a new type where keys present in U
 * replace those in T; nested objects are recursed. Arrays and primitives are replaced wholesale.
 *
 * - If T is `never`, we fall back to U (used when no explicit EventType is provided).
 * - If U is `never`, we keep T.
 */
export type DeepOverride<T, U> = [T] extends [never]
  ? U
  : [U] extends [never]
    ? T
    : T extends
          | Array<unknown>
          | Date
          | RegExp
          | bigint
          | string
          | number
          | boolean
          | symbol
          | null
          | undefined
      ? U
      : U extends
            | Array<unknown>
            | Date
            | RegExp
            | bigint
            | string
            | number
            | boolean
            | symbol
            | null
            | undefined
        ? U
        : T extends object
          ? U extends object
            ? {
                [K in keyof (T & U)]: K extends keyof U
                  ? DeepOverride<
                      K extends keyof T ? T[K] : never,
                      U[K & keyof U]
                    >
                  : K extends keyof T
                    ? T[K]
                    : never;
              }
            : T
          : U;
