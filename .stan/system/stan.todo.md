# Development Plan

When updated: 2025-09-01T15:20:00Z

## Next up
- All scripts PASS (openapi, generate, typecheck, lint, test, package, stan:build). Proceed with polish and design:  - DX (optional): stan:build currently emits “unresolved dependency” warnings for alias imports; acceptable as externals, no action required unless noise becomes a problem.  - Knip: leave WARN list as-is until after config/model refactor; then prune or ignore intentionally kept helpers.
  - Design: toolkit packaging plan (publishable API surface):
    - makeWrapHandler, HTTP middleware stack, serverless/OpenAPI builders,
    - config typing utilities (FunctionConfig, AppConfig helpers).
  - Design: simplified config model
    - Single per-function config (inline event/response schemas),
    - Collapse stack config to EventTypeMap + AppConfig (zod-typed),
    - Identify which stack helpers migrate into the library and how builders consume only (FunctionConfig, AppConfig).
  - Prepare a short migration outline and acceptance criteria for the config model changes.
  - Evaluate consolidating to a single package:
    - Likely remove the root "workspaces" entry.
    - Keep services/activecampaign as a plain folder and call Orval from the
      root (e.g., `cd services/activecampaign && npx orval`), eliminating the
      need for a child package.json.
    - Update ESLint parserOptions.project accordingly when removing the child tsconfig.
    - Once child package.json is removed, update ESLint to drop the child
      tsconfig path and, if desired, prune the services workspace from knip.json
      (optional; currently not blocking).
  - Follow-ups (post-refactor polish):
    - Consider renaming builders in docs/comments for clarity (OpenAPI/Serverless).
    - Prune deprecated references in internal docs to old names (makeWrapHandler/makeFunctionConfig/etc.).
    - Optional: expose a small keysOf<T>() helper if teams prefer arg-per-key authoring ergonomics.


## Completed (recent)
- Base TS config simplification (fix TS6304 across tools)
  - Removed composite/declaration emit flags from tsconfig.base.json to match
    the simpler “working” pattern. This resolves “Composite projects may not
    disable declaration emit” in typecheck, typedoc, and rollup plugin.

- Typecheck scope & no-emit
  - Switched `typecheck` to `tsc -p tsconfig.json --noEmit` so it exercises
    the whole repo without producing stray JS/map files.

- Rollup config stabilization
  - Set `declarationMap: false` in tsconfig.rollup.json to silence outDir
    requirements from the TS plugin. Library bundling remains dts-driven.

- Unified config and naming clarity (v0, breaking)
  - Added interface-first config helpers (EnvKeysNode, EnvSchemaNode, GlobalEnvConfig,
    GlobalParamsNode, StageParamsNode, DefineAppConfigInput/Output) and `defineAppConfig`.
  - Wrapper: `wrapHandler(envConfig, functionConfig, business)` (replaces makeWrapHandler).
  - Builders/functions renamed:
    - `makeFunctionConfig` → `defineFunctionConfig`,
    - `buildFunctionDefinitions` → `buildServerlessFunctions`,
    - `buildPathItemObject` → `buildOpenApiPath`.
  - Created `stack/config/app.config.ts` (serverless + env unifier); removed
    `stack/config/loadEnvConfig.ts`.
  - Migrated handlers and endpoint builders to new names; updated exports in src/index.ts.
  - Added runtime guards to enforce “no unspecified *EnvKeys” during config/wrapper usage.
  - Tests updated to use `wrapHandler` and direct envConfig.

- Env typing bound to function configs; wrapper signature simplified
  - `defineFunctionConfig` is now curried: `defineFunctionConfig(env)(config)`
    and brands returned configs with env (schemas + envKeys) via a private
    Symbol. This preserves strong `fnEnvKeys` typing without any `any`s.
  - `wrapHandler` now accepts only `(functionConfig, business)` and reads env
    from the branded config. Runtime subset guards remain in place.
  - Updated stack configs to the curried pattern and handlers to the new
    wrapper signature. Unit tests updated likewise.
  - Lint: removed an unused logger in the HEAD test.
  - Outcome: typecheck/docs/rollup stop complaining about widened string[] for
    `fnEnvKeys`; DX remains “dev specifies values, it just works.”

- Demo package cleanup
  - Removed services/activecampaign/package.json and tsconfig.json; the demo
    remains a plain folder driven by `orval` from the root.  - Updated ESLint parserOptions.project to drop the child tsconfig path.
  - (Optional follow-up) Prune services workspace section in knip.json later.
- Single published package (simplify workspaces)
  - Removed root `workspaces` (only the root package is published).
  - Updated `generate` script to run Orval directly:    `cd services/activecampaign && orval`.

- Rollup tsconfig hard‑pin
  - Both rollup.config.ts and stan.rollup.config.ts now explicitly pass
    'tsconfig.rollup.json' to @rollup/plugin-typescript to avoid inheriting
    the broad tsconfig.json program.
- stan:build noise reduction
  - Added baseUrl/paths to tsconfig.stan.rollup.json and restricted include set
    to avoid service wrappers; fixed EventTypeMap type predicate to silence TS2677.

- stan:build fix & DX
  - Removed outDir from tsconfig.stan.rollup.json to satisfy @rollup/plugin-typescript when emitting multiple outputs. - Marked /^@\/._/ and /^@@\/._/ as external in rollup.config.ts to reduce alias warnings in stan builds.

- Tests/build/config hardening
  - Vitest: restored default excludes via configDefaults; added cache excludes; removed deprecated deps.inline so node_modules tests are not picked up.
  - Rollup: pass tsconfig as string | false (never undefined) for @rollup/plugin-typescript; dedicated tsconfig.stan.rollup.json for stan builds.
  - Serverless builder: variance-safe buildFnEnv typing via readonly never[] pattern.

- DI inversions and surfaces
  - makeWrapHandler now injects loadEnvConfig; resolveHttpFromFunctionConfig takes endpointsRootAbs.
  - buildFunctionDefinitions/OpenAPI builders accept appConfig + injected endpointsRootAbs; stack imports from toolkit index only.
  - Added toolkit public index (src/index.ts); updated stack call sites.

- HTTP middleware and validation
  - Restored rich HTTP pipeline; added HEAD finalize to skip response validation on HEAD.
  - Mapped validation errors to 400; ensured consistent Content-Type and serialization.

- OpenAPI and generation
  - Moved generator to stack/config/openapi.ts; output to stack/openapi.json; orval generation stable with local mutator forwarder.
