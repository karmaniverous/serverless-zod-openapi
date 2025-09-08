---
title: Templates
sidebar_label: Templates
sidebar_position: 4
---

# Templates

The package ships a minimal app template and a shared “project” baseline.
## Layout

- templates/project — shared boilerplate (tsconfig/eslint/prettier/vitest/typedoc)
- templates/minimal — a small app:
  - app/config/app.config.ts
  - app/functions/rest/hello/get/{lambda,handler,openapi}.ts
  - serverless.ts
  - app/config/openapi.ts

## Register files (generated)

SMOZ keeps side‑effect registers in `app/generated/`:

- register.functions.ts — imports all `lambda.ts`
- register.openapi.ts — imports all `openapi.ts`
- register.serverless.ts — imports all per‑function `serverless.ts` (non‑HTTP)

Generate/update:

```bash
npx smoz register
```

### Template register imports (TypeScript)

Templates do not commit generated files under `app/generated/` (including
`register.*.ts`). Instead, each template ships an ambient declarations file
that declares the three register modules so TypeScript can typecheck without
artifacts:

- `@/app/generated/register.functions`
- `@/app/generated/register.openapi`
- `@/app/generated/register.serverless`

For the minimal template this file is:
`templates/minimal/types/registers.d.ts`.

When a template needs to ensure register side effects are evaluated at runtime
(e.g., in `serverless.ts` or the OpenAPI builder), import the register module
as a namespace and reference it via `void`. This satisfies TypeScript’s
`noUncheckedSideEffectImports` while still executing module side effects:

```ts
import * as __register_functions from '@/app/generated/register.functions';
void __register_functions;
```

In real apps, `smoz init` seeds empty placeholders in `app/generated/` and
`smoz register` keeps them up to date. Teams often commit the generated
`register.*.ts` files so CI typecheck remains stable.

## OpenAPI document

The template includes a script to build `app/generated/openapi.json`:

```bash
npm run openapi
```

It imports `register.openapi.ts`, collects paths, and writes the document.

## Path hygiene (cross‑platform)

Always normalize file system separators when deriving paths from `import.meta.url`
or from Node helpers. Example:

```ts
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';

export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
```

## Lint & typecheck (unified for all templates)

- Lint (ESLint drives Prettier):

  ```bash
  npm run templates:lint
  ```

  A single ESLint flat config discovers all templates (no per‑template wiring).

- Typecheck:
  ```bash
  npm run templates:typecheck
  ```
  A small script finds `templates/*/tsconfig.json` and runs `tsc -p --noEmit`
  per template. Adding a new template directory requires no script changes.

## Authoring guidelines

- Keep endpoint modules small and focused:
  - lambda.ts — define and register (`app.defineFunction`)
  - handler.ts — export `handler` via `fn.handler`
  - openapi.ts — call `fn.openapi`
  - serverless.ts (non‑HTTP only) — call `fn.serverless(extras)`
- Do not duplicate HEAD routes; the HTTP stack short‑circuits HEAD to 200 {}.
- Prefer clear routes; when you must alias, use small wrappers or redirects.

## Adding a new template

Create a new folder under `templates/*` with a `tsconfig.json`. Lint/typecheck
will pick it up automatically via the unified config and the typecheck script.

## Commit registers?

Yes—this can still be a good practice for downstream apps.

- If your CI/local scripts always run `smoz register` before
  typecheck/build/package, you don’t need to commit `app/generated/register.*.ts`.
- If you want typecheck/IDE and CI stability without relying on a prior CLI
  step, many teams commit `app/generated/register.*.ts`.

Note: The ambient declarations file included in the template
(`templates/minimal/types/registers.d.ts`) exists only to let the template
itself typecheck without generated artifacts. In a real app, you may adopt a
similar ambient `d.ts` if you prefer not to commit generated files—but you must
still run `smoz register` before any runtime that imports
`app/generated/register.*` (e.g., OpenAPI generation, packaging), otherwise
you’ll get module‑not‑found at runtime.
