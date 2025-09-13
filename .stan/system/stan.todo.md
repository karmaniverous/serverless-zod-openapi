/// Development Plan

# Development Plan

When updated: 2025-09-13T00:00:00Z

## Next up (near‑term, actionable)

1. Docs (CLI/Get started): add smoz.config.json examples (init/dev defaults) and note that first‑time use via `npx smoz` requires no install.
2. CLI polish: evaluate short‑flag overlap between root `-v/--version` and `dev -v` (verbose). Draft a non‑breaking proposal and update help text if needed.

## Completed (recent)

- Tests: add coverage for resolveHttpFromFunctionConfig (inference/errors), wrapHandler non‑HTTP bypass, registry behaviors (duplicate name, fnEnvKeys merge, serverless extras), buildPath helpers, httpZodValidator edge paths, pojofy serializer, serverless plugin hook registration, and detectSecurityContext (SigV4/v1 accessKey).
- Tests: fix init helper tests — create parent directories in conflicts tests; remove prior lockfiles before subsequent detectPm assertions.
- Tests: add unit coverage for init helpers — manifest (mergeAdditive/ensureToolkitDependency), conflicts (overwrite/example/skip), install (detectPm/unknown-pm), and seed (register placeholders). Keeps refactor confidence high.
- Refactor: split src/cli/init.ts into modules under src/cli/init/\* (index.ts, runInit.ts, helpers) and remove original file; preserve import path. Split src/http/middleware/buildHttpMiddlewareStack.ts into directory with index.ts + steps.ts and remove original file. Fixed a minor lint (unused variable) in the init flow during the move.- CLI: fix TypeScript exactOptionalPropertyTypes in init options (conditional spreads for install/conflict) and remove unnecessary optional chain in dev defaults; lint/typecheck clean.
- Default template DX: during init, ensure '@karmaniverous/smoz' is added to
  dependencies (using the running CLI version) so first-time 'npx smoz init' compiles cleanly.
- Templates:lint — add "@/..." alias to templates/default/tsconfig.eslint.json so
  ESLint resolves template-local imports; remaining errors should clear.
- Templates:lint — point ESLint at templates/default/tsconfig.eslint.json with local @karmaniverous/smoz mapping and set tsconfigRootDir in the template
  eslint.config.ts to resolve the project correctly.- Lint: remove unnecessary optional chaining in init.ts to satisfy
  @typescript-eslint/no-unnecessary-condition.
- CLI (init): fix parse/TS errors in init.ts (uncomment try for gitignore conversion; properly declare `installed` union; ensure function returns
  object).- Templates script: make templates:typecheck inject typed compilerOptions.paths
  mapping without unsafe assignments; lint/docs unblock.
- Templates: collapse to single “default”; fold project baseline into template root.
- CLI (init): resolve 'default' directly (no minimal mapping); create package.json when missing (no --init); fix optional rl typing; robust conflict policy resolution.
- Scripts: update templates:lint to use templates/default; inject temp tsconfig in templates:typecheck to map @karmaniverous/smoz.
- Tests: update init test to remove deprecated init option.
- Templates/CLI: add @serverless/typescript and @types.node to template
  devDependencies; prepare single default template migration; confirm caret version ranges pinned to majors.
- Templates: add jiti to devDependencies in full/minimal so ESLint can load TS flat configs downstream.
- Templates (minimal): add vitest devDependency and "test" script; seed templates/project/test/smoke.test.ts so tests pass out of the box.
- Templates (project): include tsdoc.json to support TSDoc tags consistently.
- Templates (project): add VS Code recommendations and settings with React filetypes in eslint.validate.
