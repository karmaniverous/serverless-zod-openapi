# Development Plan

When updated: 2025-09-08T17:45:00Z

## Next up (near‑term, actionable)
1. Templates lint (Windows verification)   - Re-run templates:lint on Windows to confirm the new     templates/minimal/tsconfig.json resolves projectService mapping.   - If any residual “not found by the project service” errors remain, add a     small, targeted mapping fallback per template; otherwise keep the current     unified config.2. Templates:typecheck (minimal) — investigate failure   - Re-run with local tsc to capture diagnostics:
     `npx tsc -p templates/minimal/tsconfig.json --noEmit`
   - Address the first concrete error (likely a missing type mapping or
     dependency types) without relaxing rules.
   - With ambient declarations in templates/minimal/types/registers.d.ts,
     typecheck should pass without requiring generated files on disk.
   - Adjusted CommonJS‑style imports in templates/minimal/app/config/openapi.ts
     to namespace imports; re‑run templates:typecheck to confirm green.
3. Loop guard: verify install
   - Each loop, check for evidence of missed npm install; prompt if needed.

## Completed (recent)
- Templates:typecheck focus — avoid stray config pickup
  - Narrowed templates/minimal/tsconfig.json includes to TS sources only and
    constrained typeRoots to "./node_modules/@types" so tsc doesn’t traverse
    unrelated package configs during template checks.
- Templates:typecheck diagnostics polish
  - Fixed ESLint warnings in the runner and added "--pretty false" for plain
    diagnostics; continue to emit both stdout/stderr on failure along with
    the invoked command for easy local reproduction.
- Templates:typecheck diagnostics
  - Updated scripts/templates-typecheck.ts to capture tsc stdout/stderr and
    print both on failure (to stdout), ensuring STAN logs include complete TS    diagnostics even if stderr is not captured separately.
  - Also prints the invoked command for easy local reproduction.
- CI ergonomics: register before typecheck
  - Updated package.json "typecheck" to run "npm run register && tsc -p
    tsconfig.json --noEmit" so fresh clones typecheck without relying on    committed app/generated/register.*.ts.
  - openapi/package already chain register; no change needed there.
- Docs & templates: document register import pattern
  - End-user docs (docs-src/templates.md): add “Template register imports”
    section describing ambient declarations and the namespace+void import    pattern (no side-effect imports) with example.
  - Inline comments in templates/minimal/serverless.ts and
    templates/minimal/app/config/openapi.ts explaining the pattern and why
    templates don’t commit generated register files.
- Templates (minimal): eliminate bare side‑effect register imports
  - Replaced `import '@/app/generated/register.*'` with namespace imports and
    explicit `void` usage to satisfy TypeScript’s `noUncheckedSideEffectImports`    while preserving evaluation ordering:
    - serverless.ts, app/config/openapi.ts.
  - Re‑run `npx tsc -p templates/minimal/tsconfig.json --noEmit` and share diagnostics if any remain.
- Templates: register placeholders policy
  - Do not commit generated register placeholders under templates/*/app/generated.
  - Use a single ambient declarations file per template (e.g., templates/minimal/types/registers.d.ts)    declaring the three register modules so templates typecheck without artifacts.
- Project prompt: compressed without losing detail; removed redundancy; kept section anchors.
- Templates: minimal register ambient declarations
  - Added templates/minimal/types/registers.d.ts declaring the three register  - imports so TS resolves them during template typecheck without needing  - generated files (avoids gitignore/STAN exclude issues).
- Templates: lint config coverage (second pass)
  - Added templates/.check/tsconfig.eslintconfig.json and included it in the
  - root ESLint parser projects so the second pass can type‑lint the unified
  - templates ESLint config on Windows without project‑service errors.
- Templates: minimal tsconfig + typecheck discovery
  - Added templates/minimal/tsconfig.json so ESLint’s projectService can map
  - files on Windows and scripts/templates-typecheck.ts discovers the template.
  - Expect templates:lint to pass on Windows and templates:typecheck to run.
- README slimming
  - Trimmed the README to essentials and linked to the docs pages (overview,
  - getting started, CLI, middleware, templates, contributing).
- Lint coverage (templates config)
  - Updated `templates:lint` to add a second pass with `--no-ignore` for
  - `templates/.check/eslint.templates.config.ts`, ensuring the config file
  - itself is always linted/fixed under stan run. Normal template files still
  - respect the unified `.check` ignores via the first pass.
- Templates: lint mapping (project discovery)
  - Switched templates ESLint parser to `project: true` with `projectService`
  - and `allowDefaultProject` so the nearest tsconfig.json is discovered per
  - file on Windows/macOS/Linux. This resolves remaining “not found by the
  - project service” errors.
- Templates: lint mapping fallback
  - Added an explicit fallback project reference to
  - `templates/.check/tsconfig.minimal.json` in the unified templates ESLint
  - config to help the project service map files reliably on Windows while
  - retaining typed linting where projects match.
- Build noise suppression (Rollup unresolved alias)
  - Broadened Rollup onwarn filters to check `source | id | exporter` so
  - UNRESOLVED_IMPORT warnings for alias ids ('@/' and '@@/') are consistently
  - suppressed in both JS and DTS builds. No change to bundling; CI output
  - is quieter.
- Templates: lint fallback
  - Enabled `allowDefaultProject: true` in the unified templates ESLint config
  - so files not mapped to a specific tsconfig by the project service still
  - lint cleanly. Typed analysis remains for files matched to a template
  - project.
- Templates: lint follow‑up
  - Updated unified templates ESLint config to ignore templates/.check/\*\*
  - so config files aren’t linted.
  - Enabled parserOptions.projectService to correctly map files to the
  - appropriate template tsconfig.json and resolve typed‑project parsing
  - errors on Windows. `npm run templates:lint` should now be green across
  - templates/\* and templates/project.
- Templates scripts/config stabilization (follow‑up):
  - Adjusted templates:lint to use a files glob so ESLint doesn’t report “No files matching the pattern” on Windows shells.
- Templates scripts/config stabilization:
  - Fixed templates:typecheck script comment terminator that broke TS parsing.
  - Switched unified templates ESLint config to explicit project globs and
  - updated templates:lint target to exclude templates/.check.
  - Added root CONTRIBUTING.md stub for GitHub discoverability.
- Docs: split authored pages under docs-src/ and wired into TypeDoc:
  - overview, getting-started, cli, middleware, templates, contributing.
- Lint/format policy: ESLint drives Prettier
  - Added 'prettier/prettier': 'error' in root and template ESLint configs.
  - Unified template lint config at templates/.check/eslint.templates.config.ts.
- Template typecheck scalability:
  - Added scripts/templates-typecheck.ts and updated npm scripts to discover
  - all templates automatically.
- Template lint fixes (minimal):
  - Sorted imports; avoided unsafe assignment by asserting stages type in serverless.ts.
- Project prompt updated to memorialize lint/format + template scalability policy.
- CLI & aggregators tests green:
  - register/add/init happy paths, idempotency, POSIX sorting (register).
  - watch debounce with coalescing; injectable watcher tests.
  - Serverless/OpenAPI aggregators: contexts → events/paths, operationId and
  - tags; env extras mapping validated.
- Docs/OpenAPI/build/package exercised:
  - openapi document generation ok; packaging ok; lint/typecheck/tests ok.
- Templates README:
  - Added cross‑platform path hygiene note (toPosixPath guidance).
- Build noise:
  - Suppress alias UNRESOLVED_IMPORT warnings during DTS bundling (onwarn in
  - buildTypes of rollup.config.ts).
- Templates validation:
  - ESLint (templates/project) — set tsconfigRootDir to fix parser error.
  - Typecheck (templates/.check) — set rootDir to templates/minimal and add
  - tsconfigRootDir in ESLint config for stable resolution; point library
  - types to .stan/dist/index.d.ts. Keep strict rules; fix template code
  - (import sort, require-await, non-null assertion, unused var) and resolve
  - d.ts alias imports during build.
- Dev environment resolution for downstream-style imports:
  - Added repo-root TypeScript paths mapping for "@karmaniverous/smoz" ->
  - [".stan/dist/index.d.ts", "dist/index.d.ts"] so editors/tsc resolve it
  - anywhere in this workspace.
  - Requirement: run `npm run stan:build` once in the smoz repo so the bundle
  - exists; no change is copied to downstream apps.
