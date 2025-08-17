/**
 * REQUIREMENTS ADDRESSED
 * - Deep, structural override so eventSchema refines EventType without erasing it.
 * - Avoid unsafe 'Function' type per lint rules.
 * - No 'any'; plain-object detection only.
 */

export type Primitive =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint;

type AnyFn = (...args: never[]) => unknown;

type Builtin =
  | Primitive
  | Date
  | RegExp
  | Error
  | AnyFn
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | Array<unknown>;

type IsPlainObject<T> = T extends Builtin
  ? false
  : T extends object
    ? true
    : false;

/**
 * DeepOverride<T, U>
 * - For keys present in U, replace T[K] with a recursive override using U[K].
 * - For keys not present in U, keep T[K].
 * - If U is not a plain object, U replaces T at that node.
 */
export type DeepOverride<T, U> =
  IsPlainObject<T> extends true
    ? IsPlainObject<U> extends true
      ? {
          [K in keyof T | keyof U]: K extends keyof U
            ? K extends keyof T
              ? DeepOverride<T[K], U[K]>
              : U[K]
            : K extends keyof T
              ? T[K]
              : never;
        }
      : U
    : U;
