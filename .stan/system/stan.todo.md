# Development Plan

When updated: 2025-09-06T19:20:00Z

## Next up (near‑term, actionable)

1) Path utilities and APP_ROOT_ABS refactor
   - Implement a tiny reusable normalizer:
     - toPosixPath(p: string): string — normalize “\” → “/”.
     - Optional: dirFromHere(metaUrl: string, levelsUp = 1): string with
       toPosixPath applied.
   - Refactor APP_ROOT_ABS in templates/examples to:
     const APP_ROOT_ABS = toPosixPath(fileURLToPath(new URL('..', import.meta.url)));
   - Acceptance:
     - Template projects compile on Windows/macOS/Linux with consistent
       path behavior.
     - README and template code updated accordingly.

2) CLI “register --watch” via chokidar
   - Add -w/--watch to “smoz register”.
   - Watch: app/functions/**/{lambda,openapi,serverless}.ts
   - Debounce: ~200–300ms.
   - On add/change/unlink: regenerate registers; print “Updated” or
     “No changes”.
   - Add script: "register:watch": "smoz register --watch"
   - Keep dev ergonomics: in-repo “register” can use tsx in package.json
     if desired; published consumers use the bin.

3) Scripts — chain register to prevent footguns
   - "openapi": "npm run register && tsx app/config/openapi && prettier -w app/generated/openapi.json"
   - "package": "npm run register && serverless package"
   - "deploy": "npm run register && serverless deploy"

4) App-level function defaults (fnEnvKeys)
   - App.create accepts functionDefaults: { fnEnvKeys: readonly string[] }.
   - Registry unions defaults with per-function fnEnvKeys before buildFnEnv.
   - Tests:
     - Defaults flow into buildFnEnv.
     - Per-function keys extend (not replace) defaults.
     - Globally exposed keys remain excluded from buildFnEnv.

5) README & templates updates
   - Imports refer to '@karmaniverous/smoz' (published).
   - Provide path constant (e.g., ENDPOINTS_ROOT_REST) or use join with
     APP_ROOT_ABS + toPosixPath consistently.
   - templates/.check/tsconfig.minimal.json maps 'smoz' → '../../src/index.ts'
     so template typechecks inside this repo.
   - Ensure templates:lint and templates:typecheck remain green.

## Completed (recent)

- Removed legacy app/openapi.json (pruned stale artifact).
- knip hygiene:
  - Ignore pre-register app/functions/\*\*/{lambda.ts,openapi.ts} so they
    don’t flag as unused prior to generating registers.  - Ignore CLI bin “smoz” as an unlisted binary.
- Documentation updates:
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

## Tests to add (CLI & aggregators)

CLI:
- register (non-watch): In a temp sandbox with fake app/functions:
  - After runRegister(): verify app/generated/register.functions.ts and
    app/generated/register.openapi.ts contain stable, sorted POSIX imports;
    idempotent on second run; Prettier integration (formatMaybe) works if
    installed, no crash if absent.
- register --watch: Simulate file changes and assert debounced regeneration
  and updated content.
- add: Generate both HTTP (rest/<segments>/<method>) and non‑HTTP
  (step/<segments>) trees; assert created list, content, idempotency.
- init: Dry-run and real copy (no install); verify package.json merged
  additively and register placeholders seeded.

Aggregators:
- serverless/buildServerlessFunctions:
  - HTTP vs non‑HTTP behavior; env includes provider + buildFnEnv extras only.
- openapi/buildAllOpenApiPaths: context prefixing, operationId composition,
  tag merge, summary augmentation.

Helpers & edge cases: resolveHttpFromFunctionConfig error clarity and overrides.