import type { ACField } from '../../wrapped/custom-fields-and-values';

/**
 * Determine whether a custom field accepts multiple selections whose value
 * must be encoded in ActiveCampaign's listbox/checkbox string format.
 * We keep this conservative to avoid false positives.
 */
export const isMultiSelectField = (field: ACField | undefined): boolean => {
  if (!field) return false;
  // Many AC installations use 'listbox' for multiselect; some specs also emit 'checkbox'/'checkboxes'
  const t =
    'type' in field && typeof (field as { type?: unknown }).type === 'string'
      ? ((field as { type?: string }).type ?? '').toLowerCase()
      : '';
  return (
    t === 'listbox' ||
    t === 'checkbox' ||
    t === 'checkboxes' ||
    t === 'checklist' ||
    t === 'multiselect'
  );
};

/** Join values into AC's listbox encoding: ||A||B||C|| */
export const toListboxString = (values: string[]): string => {
  const cleaned = values.map((v) => v.trim()).filter((v) => v.length > 0);
  if (cleaned.length === 0) return '';
  return `||${cleaned.join('||')}||`;
};

/** Parse AC's listbox encoding back into an array of values. */
export const parseListboxString = (s: string): string[] => {
  // '||A||B||' -> ['', '', 'A', '', 'B', '', ''] when naive-splitting; use filter(Boolean)
  return s.split('||').filter(Boolean);
};

/**
 * Coerce an input value to the correct string representation for updates.
 * - For multiselect fields, arrays are converted to AC's '||' encoding.
 * - For non-multiselect fields, arrays are rejected to avoid silent corruption.
 * - Strings are passed through unchanged.
 */
export const coerceFieldValueForUpdate = (
  field: ACField | undefined,
  value: string | string[],
): string => {
  if (Array.isArray(value)) {
    if (isMultiSelectField(field)) {
      return toListboxString(value);
    }
    throw new Error('Array provided for a non-multiselect field');
  }
  return value;
};
