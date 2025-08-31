/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP step function: no HTTP middleware should be applied.
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 */
import { makeWrapHandler } from '@@/lib/handler/makeWrapHandler';
import type { LambdaEvent } from '@@/lib/types/LambdaEvent';
import { getContact } from '@@/services/activecampaign/src';

import { functionConfig } from './config';
export const handler = makeWrapHandler(functionConfig, (event) => {
  // Narrow to the LambdaEvent shape established by eventSchema.transform
  type EventWithPayload = LambdaEvent & { Payload: { contactId: string } };
  const lambdaEvent = event as unknown as EventWithPayload;
  return getContact({
    contactId: lambdaEvent.Payload.contactId,
  });
});