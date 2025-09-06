# Development Plan

When updated: 2025-09-04T23:20:00Z

## Completed (recent)
- Remove eslint-plugin-eslint-comments across project and templates:
  - Dropped plugin from root and template ESLint configs.
  - Deleted leftover shim file: types/eslint-plugin-eslint-comments.d.ts
  - Removed devDependency from package.json.
  - Rationale: simplify lint stack; avoid noisy rules.

- Templates authoring: add minimal README to templates/project with
  conventions and common scripts.

- Template verification overlays & manifests:
  - Added templates/.check/tsconfig.minimal.json and eslint.minimal.config.ts
  - Added templates/.manifests/package.minimal.json and package.project.json

- CLI init enhancements:
  - Additive manifest merge into package.json (deps/devDeps/scripts)
  - Copy-if-absent with .example on conflicts (no content merges)
  - --install[=<pm>] with tiny safe detection; no auto-install by default

## Next up

1) Templates authoring (packaged assets)
   - Objective: robust starting baseline for new apps.
   - Remaining:
     a. (DONE) Add a minimal README snippet to templates/project.
   - Acceptance:
     - Fresh template copy compiles (typecheck), lints, tests (empty OK), and docs tooling loads.

2) CLI — verify register end-to-end

   - Build CLI (npm run cli:build).
   - Run register to generate app/generated/register.*.ts from current app/functions.
   - Acceptance: “smoz -v” prints signature; register writes files idempotently and formats with Prettier.

3) Documentation updates
   - Update README Quick Start to use app/functions/* paths (no app/endpoints).
   - Document CLI workflow (init/register/add) and generated files (app/generated/*).
   - Note httpEventTypeTokens lives only in app/config/app.config.ts.
   - VCS guidance: commit app/generated/register.*.ts; openapi.json generally ignored.