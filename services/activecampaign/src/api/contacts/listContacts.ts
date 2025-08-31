import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import type { Optionalize } from '@@/src/types/Optionalize';
import {
  fetchContactFieldValues,
  fetchContactsList,
} from '@@/src/wrapped/contacts';

import { getFieldMaps, materialize } from './helpers';
import { contactSchema } from './schemas';

export const listContactsParamsSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  tag: z.string().optional(),
  listId: z.union([z.string(), z.number()]).optional(),
  customFieldFilter: z
    .object({
      name: z.string(),
      value: z.string(),
    })
    .optional(),
});

export type ListContactsParams = z.infer<typeof listContactsParamsSchema>;

export const listContactsOutputSchema = z.object({
  contacts: z.array(contactSchema),
  total: z.number().int().nonnegative().optional(),
});
export type ListContactsOutput = z.infer<typeof listContactsOutputSchema>;

export const listContacts = async (
  params: Optionalize<ListContactsParams>,
  options?: AxiosRequestConfig,
): Promise<ListContactsOutput> => {
  const parsed = listContactsParamsSchema.parse(params ?? {});

  const maps = await getFieldMaps(options);

  // 1) Coarse list
  const baseRes = await fetchContactsList(
    {
      email: parsed.email,
      phone: parsed.phone,
      tag: parsed.tag,
      listid: parsed.listId,
      limit: parsed.limit,
      offset: parsed.offset,
    },
    options,
  );

  const coarse = baseRes.data.contacts;
  // 2) If filtering by custom field, post-filter coarse by that
  const filtered =
    parsed.customFieldFilter === undefined
      ? coarse
      : coarse.filter((c) => {
          const name = parsed.customFieldFilter?.name;
          const val = parsed.customFieldFilter?.value;
          return Boolean(
            name &&
              val &&
              (c as unknown as { fields?: Record<string, unknown> }).fields?.[
                name
              ] === val,
          );
        });

  // 3) Hydrate each with field values and materialize with catalog
  const out = await Promise.all(
    filtered.map(async (r) => {
      const { data: fvRes } = await fetchContactFieldValues(
        Number(r.id),
        options,
      );
      const fvals = fvRes.fieldValues;
      return materialize(r, fvals, maps);
    }),
  );

  return listContactsOutputSchema.parse({ contacts: out, total: out.length });
};
