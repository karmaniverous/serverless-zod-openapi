import type z from 'zod';

export type ShapedResponse<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? Promise<z.output<ResponseSchema>>
    : Promise<Record<string, never>>;
