export const pojofy = (input: unknown): unknown => {
  const seen = new WeakSet<object>();

  const replacer = (_key: string, value: unknown): unknown => {
    if (value === null) return null;

    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;

    // Eliminate non-JSON scalars
    if (
      t === 'undefined' ||
      t === 'function' ||
      t === 'symbol' ||
      t === 'bigint'
    ) {
      return undefined;
    }

    // Keep Date as ISO via its built-in toJSON
    if (value instanceof Date) return value;

    // Drop common non-JSON containers
    if (
      value instanceof Map ||
      value instanceof Set ||
      value instanceof WeakMap ||
      value instanceof WeakSet
    ) {
      return undefined;
    }

    // Drop raw binary; convert typed arrays (incl. Buffer) to JSON-safe arrays
    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
      return undefined;
    if (ArrayBuffer.isView(value))
      return Array.from(value as unknown as ArrayLike<number>);

    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return undefined; // eliminate circular refs
    seen.add(obj);
    return obj; // let JSON.stringify walk own-enumerable props
  };

  return JSON.parse(JSON.stringify(input, replacer));
};
