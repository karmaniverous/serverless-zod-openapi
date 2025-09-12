import { fn } from './lambda';

// Attach SQS trigger (replace ARN with your queue)
fn.serverless([
  {
    sqs: { arn: 'arn:aws:sqs:us-east-1:000000000000:my-queue' },
  },
]);
