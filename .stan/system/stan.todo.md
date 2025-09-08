# Development Plan

When updated: 2025-09-07T17:45:00Z

## Next up (near‑term, actionable)

1. Template/Docs polish
   - Run templates:typecheck and templates:lint to re‑verify the template
     workspaces after helper refactors. Address any drift (lint rules,
     tsconfig) and keep README instructions accurate.
2. Optional: build noise
   - If any residual warnings remain, consider further tuning (e.g., dts
     externals or paths) — non‑blocking polish.

## Completed (recent)

- CLI & aggregators tests green:
  - register/add/init happy paths, idempotency, POSIX sorting (register).
  - watch debounce with coalescing; injectable watcher tests.
  - Serverless/OpenAPI aggregators: contexts → events/paths, operationId and
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
