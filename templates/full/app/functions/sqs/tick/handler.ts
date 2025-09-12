import { fn } from './lambda';

export const handler = fn.handler((event) => {
  // process SQS batch event
  void event;
  // no response payload (void)
});
