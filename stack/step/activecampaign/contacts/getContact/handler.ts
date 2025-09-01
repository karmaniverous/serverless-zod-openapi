/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP step function: no HTTP middleware should be applied.
 * - Call wrapHandler with (envConfig, functionConfig, businessHandler).
 */
import { getContact } from '@/services/activecampaign/src';
import type { LambdaEvent } from '@/src';
import { wrapHandler } from '@/src';
import { envConfig } from '@/stack/config/app.config';

import { functionConfig } from './config';
export const handler = wrapHandler(envConfig, functionConfig, (event) => {
  // Narrow to the LambdaEvent shape established by eventSchema.transform
  type EventWithPayload = LambdaEvent & { Payload: { contactId: string } };
  const lambdaEvent = event as unknown as EventWithPayload;
  return getContact({
    contactId: lambdaEvent.Payload.contactId,
  });
});
