---
title: Recipes
sidebar_label: Recipes
sidebar_position: 6
children:
  - ./sqs.md
  - ./contexts-auth.md
  - ./custom-middleware.md
  - ./per-function-env.md
  - ./observability.md
  - ./troubleshooting.md
---
# Recipes

Concrete patterns you can lift into your app. Each recipe links to a focusedpage with short snippets.

- [SQS function](./sqs.md)
- [Contexts + Cognito authorizer](./contexts-auth.md)
- [Custom middleware (insertAfter 'shape')](./custom-middleware.md)
- [Per‑function env (fnEnvKeys)](./per-function-env.md)
- [Observability (requestId header)](./observability.md)
- [Troubleshooting](./troubleshooting.md)

Examples (in repository)

- REST only: https://github.com/karmaniverous/smoz/tree/main/examples/rest-only
- REST + SQS (non‑HTTP): https://github.com/karmaniverous/smoz/tree/main/examples/rest-sqs
- REST + Step Functions (non‑HTTP): https://github.com/karmaniverous/smoz/tree/main/examples/rest-step

Tip: Keep endpoint modules small and focused:
```
lambda.ts       // define/register function
handler.ts      // business handler
openapi.ts      // attach OpenAPI operation
serverless.ts   // (non‑HTTP only) attach platform events
```
