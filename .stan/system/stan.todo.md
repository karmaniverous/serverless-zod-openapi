# Development Plan

When updated: 2025-09-07T10:20:00Z

## Next up (near‑term, actionable)
1) Tests — CLI & aggregators
   - register (non-watch): stable, POSIX-sorted imports; idempotency; Prettier integration safe.
   - register --watch: debounce and multi-event simulation.
   - add/init: creation lists, idempotency, manifest merge.
   - serverless/openapi aggregators: contexts → events, operationId composition; env extras only; summaries/tags.
   - knip: apply hints (remove redundant entry and unneeded ignoreBinaries).
2) Template/Docs polish
   - Re-verify templates:lint and templates:typecheck after helper refactor.
   - Expand README with short “Path hygiene” note referencing toPosixPath.

## Completed (recent)

- Serverless tests OS portability:
  - src/serverless/buildServerless.test.ts — use Windows/POSIX-aware file URLs and endpoints roots to satisfy fileURLToPath on Windows.
- CLI register test robustness:
  - src/cli/register.test.ts — accept either single or double quotes in generated import assertions.
- Fix tests & lint for stability across platforms:
  - src/cli/register.test.ts — add missing closing brace; remove unused helper.
  - src/serverless/buildServerless.test.ts — complete non-HTTP extras test and close blocks.
  - src/openapi/buildOpenApi.test.ts — make file URL/endpoints root OS-portable to avoid Windows fileURLToPath errors.
  - src/cli/add.test.ts, src/cli/init.test.ts — remove unused variables to satisfy eslint.- Dev hygiene (typecheck/lint/build):
  - CLI: removed duplicate import of `join` and replaced unnecessary optional
    chain on `opts.watch` in register --watch handler.  - App: pass `functionDefaults` to registry only when defined to satisfy
    exactOptionalPropertyTypes with `--exactOptionalPropertyTypes`.
  - Scripts: made `"register"` and `"register:watch"` use `tsx src/cli/index.ts`
    so in-repo development works on Windows without a built CLI bin.
  - Template: unified imports to `@karmaniverous/smoz` for path helpers to
    match template tsconfig mapping.

- Path utilities & APP_ROOT_ABS refactor:
  - Added src/util/path.ts with toPosixPath and dirFromHere.
  - Exported from public entry; updated app/config/app.config.ts.
  - Updated templates to use toPosixPath and published import name.- CLI “register --watch”:
  - Added -w/--watch to “smoz register” using chokidar with ~250ms debounce.
  - Added script: "register:watch": "smoz register --watch".
- Scripts — chain register to prevent footguns:
  - openapi/package/deploy scripts now prefix npm run register.
- App-level function defaults (fnEnvKeys):
  - App.create now accepts functionDefaults.fnEnvKeys.
  - Registry merges defaults into per-function fnEnvKeys to drive both runtime
    env parsing and serverless buildFnEnv (extras-only).
- README & templates updates:
  - Quick Start now uses toPosixPath + '@karmaniverous/smoz' imports.
  - templates/.check tsconfig maps '@karmaniverous/smoz' to '../../src/index.ts'.
- Removed legacy app/openapi.json (pruned stale artifact).
- knip hygiene:
  - Ignore pre-register app/functions/\*\*/{lambda.ts,openapi.ts} so they
    don’t flag as unused prior to generating registers.  - Ignore CLI bin “smoz” as an unlisted binary.- Documentation updates:
  - README Quick Start now uses app/functions/\* paths.
  - OpenAPI & Serverless snippets load CLI-generated registers.
  - Added npm script `register` and noted generated output path.
- Seed placeholder register files under app/generated so imports resolve
  prior to running `smoz register`.
- Switch Serverless/OpenAPI to use CLI‑generated register files
  (app/generated/register.\*.ts); removed direct function imports to align
  runtime with the CLI “register” workflow.
- CLI lint polish (init): track dependency merge changes with a boolean flag in
  mergeAdditive; avoids unnecessary-condition while preserving behavior.
- CLI lint polish (init): normalize install option into `stringInstall` and compare against '' to avoid unnecessary-condition on length checks.
- CLI lint polish (init): derive pm (string or detected) and run install only
  when pm is defined; removes unnecessary-condition in install logic.
- Lint zero (init): ESLint passes with 0 errors after refining optional
  install logic; `npm run lint` returns clean.
- CLI lint fix (init): resolve @typescript-eslint/no-unnecessary-condition by
  replacing a broad truthiness check on Object.keys(out).length with an explicit

  > 0 comparison in mergeAdditive. Keeps behavior identical and satisfies the > rule.- Remove eslint-plugin-eslint-comments across project and templates:
  - Dropped plugin from root and template ESLint configs. - Deleted leftover shim file: types/eslint-plugin-eslint-comments.d.ts - Removed devDependency from package.json. - Rationale: simplify lint stack; avoid noisy rules.

- Templates authoring: add minimal README to templates/project with
  conventions and common scripts.

- Template verification overlays & manifests:
  - Added templates/.check/tsconfig.minimal.json and eslint.minimal.config.ts
  - Added templates/.manifests/package.minimal.json and package.project.json

- CLI init enhancements:
  - Additive manifest merge into package.json (deps/devDeps/scripts)
  - Copy-if-absent with .example on conflicts (no content merges)
  - --install[=<pm>] with tiny safe detection; no auto-install by default
  - TypeScript and lint polish: spawnSync typing, literal return, and
    avoiding unnecessary nullish/optional checks
  - Follow-up fix: ensure `installed` variable is declared (newline) and
    replace one remaining optional-chain with a boolean guard
  - Final lint pass: remove two remaining optional chains in init (creation
    dryRun guard; install option read)
  - Resolve remaining lint warning by replacing broad truthiness check for
    install option with an explicit predicate (done).

- Templates authoring (packaged assets) — acceptance
  - Fresh template copy compiles (templates:typecheck), lints (templates:lint),
    tests (empty OK), and docs tooling loads.