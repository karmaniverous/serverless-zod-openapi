# Development Plan

When updated: 2025-09-04T23:05:00Z

## Completed (recent)

- Remove eslint-plugin-eslint-comments across project and templates:
  - Dropped plugin from root and template ESLint configs.
  - Deleted local type shim under types/.
  - Removed devDependency from package.json.
  - Rationale: simplify lint stack; avoid noisy rules.

## Next up

3. Templates authoring (packaged assets)
   - Objective: Provide a robust starting baseline for new apps. - Remaining tasks:
     a. Project boilerplate: include vitest and typedoc configs (baseline).
     b. Minimal docs: brief README snippet in template notes (future slice).
   - Acceptances
     - A fresh copy of the template compiles (typecheck), lints cleanly,
       tests run (empty suite OK), and docs tooling loads.

Next slice (CLI):

- Implement `smoz register` (scan app/functions/\*_ and write
  app/generated/register._.ts, idempotent + Prettier). Defer `add` and `init`
  to following slices.
- Acceptance: running `npm run cli:build && node dist/cli/index.cjs` works;
  `smoz -V` prints version.

5. Documentation updates
   Design (proposal)
   - Update README Quick Start to use app/functions/\* paths (no app/endpoints).
   - Document CLI workflow up front (init/register/add) and generated files
     (app/generated/\*).
   - Note httpEventTypeTokens lives only in app/config/app.config.ts.
   - VCS guidance: commit app/generated/register.\*.ts; openapi.json generally
     ignored.
