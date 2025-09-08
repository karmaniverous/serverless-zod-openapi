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

## OpenAPI document

The template includes a script to build `app/generated/openapi.json`:

```bash
npm run openapi
```

It imports `register.openapi.ts`, collects paths, and writes the document.

## Path hygiene (cross‑platform)

Always normalize file system separators when deriving paths from `import.meta.url`
or from Node helpers. Example:

````ts
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';

export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
````

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

Teams often commit `app/generated/register.*.ts` so typecheck is stable without
running the CLI. `openapi.json` can remain untracked.
