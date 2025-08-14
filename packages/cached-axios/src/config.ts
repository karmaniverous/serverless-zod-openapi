import { z } from 'zod';

/** Branded cache key types */
export type Id = string & { readonly __brand: 'Id' };
export type Tag = string & { readonly __brand: 'Tag' };

/**
 * Input config schema
 *  - Nested objects; leaves are `undefined`.
 */
export const ConfigInputSchema: z.ZodType<Record<string, unknown>> = z.lazy(
  () => z.record(z.string(), z.union([z.undefined(), ConfigInputSchema])),
);

export type ConfigInput = z.output<typeof ConfigInputSchema>;

/** Segment types accepted by id/tag */
type Segment = string | number;
type SegInput = Segment | Segment[] | undefined;

/** Methods at every node */
type WithFns = {
  id: (seg?: SegInput) => Id;
  tag: (seg?: SegInput) => Tag;
};

type Leaf = undefined;
type Shape = { readonly [k: string]: Shape | Leaf };

export type BuiltNode<T, P extends string[]> = WithFns &
  (T extends undefined
    ? {}
    : { readonly [K in keyof T]: BuiltNode<T[K], [...P, Extract<K, string>]> });

const toSegs = (seg?: SegInput): string[] =>
  seg === undefined
    ? []
    : Array.isArray(seg)
      ? seg.map((s) => String(s))
      : [String(seg)];

const join = (parts: Array<string | number>): string =>
  parts.map(String).join(':');

const buildAt = (node: unknown, path: string[]): unknown => {
  const out: Record<string, unknown> = {
    id: (seg?: SegInput) => join([...path, ...toSegs(seg)]) as Id,
    tag: (seg?: SegInput) => join([...path, ...toSegs(seg)]) as Tag,
  };
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node as Record<string, unknown>)) {
      const child = (node as Record<string, unknown>)[key];
      out[key] = buildAt(child, [...path, key]);
    }
  }
  return out as unknown;
};

export const buildConfig = <T extends Shape>(input: T): BuiltNode<T, []> => {
  const cfg = ConfigInputSchema.parse(input) as unknown as T;
  return buildAt(cfg, []) as BuiltNode<T, []>;
};
