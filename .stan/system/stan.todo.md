# Development Plan

When updated: 2025-09-08T12:30:00Z

## Next up (near‑term, actionable)
1. README slimming
   - Trim README to essentials and link to new docs pages (overview/getting‑started/cli/middleware/templates/contributing).
2. Optional: build noise
   - If residual warnings remain, consider further tuning (non‑blocking).

## Completed (recent)

- Templates scripts/config stabilization:
  - Fixed templates:typecheck script comment terminator that broke TS parsing.
  - Switched unified templates ESLint config to explicit project globs and
    updated templates:lint target to exclude templates/.check.
  - Added root CONTRIBUTING.md stub for GitHub discoverability.
- Docs: split authored pages under docs-src/ and wired into TypeDoc:
  - overview, getting-started, cli, middleware, templates, contributing.
- Lint/format policy: ESLint drives Prettier  - Added 'prettier/prettier': 'error' in root and template ESLint configs.
  - Unified template lint config at templates/.check/eslint.templates.config.ts.
- Template typecheck scalability:
  - Added scripts/templates-typecheck.ts and updated npm scripts to discover
    all templates automatically.
- Template lint fixes (minimal):
  - Sorted imports; avoided unsafe assignment by asserting stages type in serverless.ts.
- Project prompt updated to memorialize lint/format + template scalability policy.
- CLI & aggregators tests green:
  - register/add/init happy paths, idempotency, POSIX sorting (register).
  - watch debounce with coalescing; injectable watcher tests.  - Serverless/OpenAPI aggregators: contexts → events/paths, operationId and
    tags; env extras mapping validated.
- Docs/OpenAPI/build/package exercised:
  - openapi document generation ok; packaging ok; lint/typecheck/tests ok.
- Templates README:
  - Added cross‑platform path hygiene note (toPosixPath guidance).
- Build noise:
  - Suppress alias UNRESOLVED_IMPORT warnings during DTS bundling (onwarn in
    buildTypes of rollup.config.ts).
- Templates validation:
  - ESLint (templates/project) — set tsconfigRootDir to fix parser error.
  - Typecheck (templates/.check) — set rootDir to templates/minimal and add
    tsconfigRootDir in ESLint config for stable resolution; point library
    types to .stan/dist/index.d.ts. Keep strict rules; fix template code
    (import sort, require-await, non-null assertion, unused var) and resolve
    d.ts alias imports during build.
- Dev environment resolution for downstream-style imports:
  - Added repo-root TypeScript paths mapping for "@karmaniverous/smoz" ->
    [".stan/dist/index.d.ts", "dist/index.d.ts"] so editors/tsc resolve it
    anywhere in this workspace.
  - Requirement: run `npm run stan:build` once in the smoz repo so the bundle
    exists; no change is copied to downstream apps.