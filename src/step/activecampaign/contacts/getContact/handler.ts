/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP step function: no HTTP middleware should be applied.
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 */
import type { LambdaEvent } from '@@/lib/types/LambdaEvent';
import { makeWrapHandler } from '@@/lib/handler/makeWrapHandler';
import { getContact } from '@@/services/activecampaign/src';

import { functionConfig } from './config';

export const handler = makeWrapHandler(functionConfig, (event) => {
  // Narrow to the LambdaEvent shape established by eventSchema.transform
  const lambdaEvent = event as unknown as LambdaEvent;
  return getContact({
    contactId: lambdaEvent.Payload.contactId,
  });
});