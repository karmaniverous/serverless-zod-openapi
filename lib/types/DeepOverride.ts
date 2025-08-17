/**
 * REQUIREMENTS ADDRESSED
 * - Provide a deep, structural override utility to merge z.infer<EventSchema>
 *   onto the declared AWS EventType so the handler keeps the full event surface.
 * - Arrays and non-plain objects are replaced by the schema when present.
 * - Preserve project conventions and avoid 'any'.
 */

export type Primitive =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint;

type Builtin =
  | Primitive
  | Date
  | RegExp
  | Error
  | Function
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
