import type { AxiosRequestConfig } from 'axios';

import {
  fetchContactFieldValues,
  fetchContactsList,
} from '../../wrapped/contacts';
import { getFieldMaps, materialize } from './helpers';
import {
  listContactsParamsSchema,
  type ListContactsResult,
  listContactsResultSchema,
} from './schemas';

export const listContacts = async (
  rawParams: unknown,
  options?: AxiosRequestConfig,
): Promise<ListContactsResult> => {
  const params = listContactsParamsSchema.parse(rawParams);

  const maps = await getFieldMaps(options);

  // 1) Coarse list
  const baseRes = await fetchContactsList(
    {
      email: params.email,
      phone: params.phone,
      tag: params.tag,
      listid: params.listId,
      limit: params.limit,
      offset: params.offset,
    },
    options,
  );

  const coarse = baseRes.data.contacts;
  // 2) If filtering by custom field, post-filter coarse by that
  const filtered =
    params.customFieldFilter === undefined
      ? coarse
      : coarse.filter((c) => {
          const name = params.customFieldFilter?.name;
          const val = params.customFieldFilter?.value;
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

  return listContactsResultSchema.parse({ contacts: out, total: out.length });
};
