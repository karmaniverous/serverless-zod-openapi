import type { AxiosRequestConfig } from 'axios';

import type { ACContact, ACFieldValue } from '../../wrapped/contacts';
import {
  fetchContactFieldValues,
  fetchContactsList,
} from '../../wrapped/contacts';
import { getFieldMaps, materialize } from './helpers';
import {
  type ListContactsParams,
  ListContactsParamsZ,
  type ListContactsResult,
  ListContactsResultZ,
} from './schemas';

export const listContacts = async (
  rawParams: unknown = {},
  options?: AxiosRequestConfig,
): Promise<ListContactsResult> => {
  const params = ListContactsParamsZ.parse(rawParams);
  const maps = await getFieldMaps(options);

  const query: Record<string, unknown> = {};
  if (params.search !== undefined) query.search = params.search;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;

  const baseRes = await fetchContactsList(query, options);
  const rows = (baseRes.data?.contacts ?? []);

  let filtered: ACContact[] = rows;
  if (params.customFieldFilter) {
    const meta = maps.byName.get(params.customFieldFilter.name);
    if (meta) {
      // Lightweight client-side filter via field values fetch for each row
      const allow = new Set<string>();
      // Fetch values in sequence to avoid AC rate limits (optimize later if needed)
      for (const r of rows) {
        const { data: fvRes } = await fetchContactFieldValues(
          Number(r.id),
          options,
        );
        const fvals = (fvRes?.fieldValues ?? []);
        if (
          fvals.some(
            (v) =>
              v.field === meta.id &&
              v.value === params.customFieldFilter!.value,
          )
        ) {
          allow.add(r.id);
        }
      }
      filtered = rows.filter((r) => allow.has(r.id));
    }
  }

  const out = await Promise.all(
    filtered.map(async (r) => {
      const { data: fvRes } = await fetchContactFieldValues(
        Number(r.id),
        options,
      );
      const fvals = (fvRes?.fieldValues ?? []);
      return materialize(r, fvals, maps);
    }),
  );

  return ListContactsResultZ.parse({ contacts: out, total: out.length });
};
