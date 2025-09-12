# Example: REST + SQS (non‑HTTP)

A minimal example that adds a non‑HTTP SQS function to the template.

Prerequisites

- Node 22.x
- A package manager (npm/pnpm/yarn/bun)

Steps

1. Create a fresh directory and initialize the template:
   ```bash
   mkdir -p /tmp/smoz-rest-sqs && cd /tmp/smoz-rest-sqs
   npx smoz init --yes
   ```
2. Add an SQS function (non‑HTTP):
   ```bash
   npx smoz add sqs/tick
   ```
   This creates:
   - `app/functions/sqs/tick/lambda.ts`
   - `app/functions/sqs/tick/handler.ts`
3. Attach an SQS event (serverless extras)

   Create `app/functions/sqs/tick/serverless.ts`:

   ```ts
   import { fn } from './lambda';

   // Attach SQS trigger (replace ARN with your queue)
   fn.serverless([
     { sqs: { arn: 'arn:aws:sqs:us-east-1:123456789012:my-queue' } },
   ]);
   ```

4. Generate registers and OpenAPI:
   ```bash
   npx smoz register
   npm run openapi
   ```
5. Package with Serverless (no deploy):
   ```bash
   npm run package
   ```

Notes

- Non‑HTTP flows bypass the HTTP middleware; your handler receives raw events (shaped only by any Zod schemas you provide).
- The registry aggregates serverless extras from per‑function `serverless.ts`; ensure your top‑level `serverless.ts` imports `@/app/generated/register.serverless`.

Troubleshooting

- If “module not found” for `app/generated/register.*`, run:
  ```bash
  npx smoz register
  ```
- To exercise the HTTP path too, you can additionally add and package a simple endpoint:
  ```bash
  npx smoz add rest/hello/get
  npx smoz register && npm run openapi && npm run package
  ```
