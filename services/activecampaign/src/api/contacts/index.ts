export { createContact } from './createContact';
export { deleteContact } from './deleteContact';
export { getContact } from './getContact';
export { listContacts } from './listContacts';
export { updateContact } from './updateContact';

// Shared/contact-wide shapes
export type {
  Contact,
  ListContactsParams,
  ListContactsResult,
} from './schemas';
export { ContactZ, ListContactsParamsZ, ListContactsResultZ } from './schemas';

// Function-specific input types (local to files)
export type { CreateContactInput } from './createContact';
export type { UpdateContactInput } from './updateContact';

// (Optionally also re-export their schemas if callers need runtime parsing)
export { createContactInputSchema } from './createContact';
export { updateContactInputSchema } from './updateContact';
