# Development Plan

When updated: 2025-08-31T05:20:00Z

## Next up
- All scripts PASS (openapi, generate, typecheck, lint, test, package, stan:build). Proceed with polish and design:
  - DX (optional): stan:build currently emits “unresolved dependency” warnings for alias imports; acceptable as externals, no action required unless noise becomes a problem.
  - Knip: leave WARN list as-is until after config/model refactor; then prune or ignore intentionally kept helpers.
  - Design: toolkit packaging plan (publishable API surface):
    - makeWrapHandler, HTTP middleware stack, serverless/OpenAPI builders,
    - config typing utilities (FunctionConfig, AppConfig helpers).
  - Design: simplified config model
    - Single per-function config (inline event/response schemas),
    - Collapse stack config to EventTypeMap + AppConfig (zod-typed),
    - Identify which stack helpers migrate into the library and how builders consume only (FunctionConfig, AppConfig).
  - Prepare a short migration outline and acceptance criteria for the config model changes.

## Completed (recent)

- stan:build noise reduction
  - Added baseUrl/paths to tsconfig.stan.rollup.json and restricted include set
    to avoid service wrappers; fixed EventTypeMap type predicate to silence TS2677.

- stan:build fix & DX
  - Removed outDir from tsconfig.stan.rollup.json to satisfy @rollup/plugin-typescript when emitting multiple outputs.  - Marked /^@\/.*/ and /^@@\/.*/ as external in rollup.config.ts to reduce alias warnings in stan builds.

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