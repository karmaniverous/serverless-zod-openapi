# Development Plan

When updated: 2025-09-01T17:20:00Z

## Next up
- All scripts PASS (openapi, generate, typecheck, lint, test, package, stan:build). Proceed with polish and design: - DX (optional): stan:build currently emits “unresolved dependency” warnings for alias imports; acceptable as externals, no action required unless noise becomes a problem. - Knip: leave WARN list as-is until after config/model refactor; then prune or ignore intentionally kept helpers.  - Design: toolkit packaging plan (publishable API surface):
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
    - Update ESLint parserOptions.project accordingly when removing the child tsconfig path.
    - Once child tsconfig path and, if desired, prune the services workspace from knip.json
      (optional; currently not blocking).
  - Follow-ups (post-refactor polish):
    - Consider renaming builders in docs/comments for clarity (OpenAPI/Serverless).
    - Prune deprecated references in internal docs to old names (makeWrapHandler/makeFunctionConfig/etc.).
    - Optional: expose a small keysOf<T>() helper if teams prefer arg-per-key authoring ergonomics.
  - Tools: registration generator CLI (new)
    - Implement a published CLI (bin: `szo`) with a command `szo gen:register` that:
      - Scans glob patterns (defaults):
        - Functions (lambda): app/\*\*/lambda.ts
        - OpenAPI ops: app/\*\*/openapi.ts
        - Serverless extras: app/\*\*/serverless.ts
      - Emits deterministic, Prettier-formatted import aggregators:
        - app/register.functions.ts
        - app/register.openapi.ts
        - app/register.serverless.ts
      - Options: custom globs via config file (e.g., app/.szo.gen.json) or package.json “szo” key.
      - Acceptance: idempotent generation, CI-safe, supports POSIX paths on all OS, optional watch mode (later).

## Next up (App singleton & registry implementation; v0, breaking)

1. Event-type schema & app construction (schema-first)

- Add baseEventTypeMapSchema (rest/http/sqs) with z.custom<…> types.
- Extend DefineAppConfig to accept eventTypeMapSchema and runtime-assert it
  contains all base keys.
- Construct the singleton app instance in app/config/app.config.ts with:
  - global params schema + envKeys,
  - stage params schema + envKeys,
  - serverless defaults,
  - eventTypeMapSchema (extend base to add 'step').

2. Slug generator (configurable; default provided)

- Introduce type SlugGenerator = (rootPath: string, functionPath: string) => string.
- Implement defaultSlugGenerator(root, path): derive a POSIX, lowercase,
  safe slug from the relative path (no spaces, compress dashes).
- App config accepts slugGenerator?: SlugGenerator; default if omitted.

3. Registry + per-function API

- Implement app.defineFunction(options) with a single options object:
  - options.slug?: string (optional; default derived),
  - callerModuleUrl, endpointsRootAbs (for derivations/identity),
  - functionName, eventType, (event|response)Schema?, fnEnvKeys?,
  - HTTP-only: method?, basePath?, httpContexts?, contentType?,
  - Non-HTTP: events?.
- On registration:
  - Throw on duplicate slug (clear error with both module paths).
  - Brand the stored FunctionConfig with env via private Symbol.
- Return per-function API:
  - handler(business): wrap & return the runtime handler,
  - openapi(baseOperation): attach OpenAPI,
  - serverless(extras?): attach non-HTTP events.

4. Module hygiene & loaders

- Per function, split large concerns freely:
  - lambda.ts (registration; exports fn),
  - handler.ts (exports handler via fn.handler),
  - openapi.ts (calls fn.openapi),
  - serverless.ts (non-HTTP; calls fn.serverless).
- Add explicit loaders:
  - register.functions.ts → import all lambda.ts,
  - register.openapi.ts → import all openapi.ts,
  - register.serverless.ts → import all serverless.ts.
- Update entrypoints:
  - serverless.ts: import app + register.functions + register.serverless;
    functions = app.buildAllServerlessFunctions().
  - app/config/openapi.ts: import app + register.functions + register.openapi;
    paths = app.buildAllOpenApiPaths().

5. OpenAPI & Serverless generation

- Serverless function id = slug.
- OpenAPI operationId defaults:
  - HTTP: `${slug}_${method}` or `${slug}_${method}_${context}` for each context,
  - Non-HTTP: slug (or configurable suffix if desired later).
- Provider environment from app.environment; per-function env via buildFnEnv
  merging fnEnvKeys and excluding globally exposed keys.

6. BREAKING removals (no shims; no backward-compat)

- Remove exported envConfig and any “loadEnvConfig” helpers.
- Remove free-function defineFunctionConfig/defineFunctionConfigFromApp; the
  only authoring surface is app.defineFunction(options), which returns a typed
  per-function API object ({ handler, openapi, serverless }).
- Remove free-function builders buildServerlessFunctions/buildOpenApiPath from
  the public API; these are now app instance methods used internally by the
  registry aggregations (or exposed as app.buildAllServerlessFunctions/
  app.buildAllOpenApiPaths only).

7. Migration (initial endpoints)

- Convert openapi/get to lambda.ts + handler.ts + openapi.ts.
- Convert step/activecampaign/contacts/getContact to lambda.ts + handler.ts (+ serverless.ts if needed).
- Create loaders (register.functions.ts, register.openapi.ts, register.serverless.ts).
- Update serverless.ts and app/config/openapi.ts to import loaders and call
  app build methods.

8. Acceptance criteria

- Typecheck/lint/test/openapi/package/stan:build PASS.
- No envConfig exports; no old free-function surfaces present/exported.
- HTTP detection remains limited to 'rest'|'http'; app-local event types
  (e.g., 'step') only affect typing and non-HTTP registration.
- Duplicate slug throws with clear error.
- Knip configuration updated (optional after refactor) to reflect loader files.

- buildAllOpenApiPaths() merges per-function paths.

- Serverless:
  - app.buildAllServerlessFunctions():
    - For HTTP: derive handler, method/path via resolveHttpFromFunctionConfig
      using stored { callerModuleUrl, endpointsRootAbs } and per-function HTTP
      fields; functions[slug] is created.
    - For non-HTTP: include per-function events attached via fn.serverless().
    - Provider-level environment is taken from app.environment. Per-function
      buildFnEnv merges fnEnvKeys and excluding globally exposed keys.
  - HTTP token widening:
    - App.httpEventTypeTokens defaults to ['rest','http'] and can be widened by apps.
    - wrapHandler accepts an optional { httpEventTypeTokens } to keep standalone usage viable.
    - Note: compile-time gating for HTTP-only options remains on base tokens; runtime behavior may widen.
    - Acceptance: docs/tests cover widened behavior; explicit policy recorded in project prompt.

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
  - Created `app/config/app.config.ts` (serverless + env unifier); removed
    `app/config/loadEnvConfig.ts`.
  - Migrated handlers and endpoint builders to new names; updated exports in src/index.ts.
  - Added runtime guards to enforce “no unspecified \*EnvKeys” during config/wrapper usage.
  - Tests updated to use `wrapHandler` and direct envConfig.
  - Outcome: typecheck/docs/rollup stop complaining about widened string[] for
    `fnEnvKeys`; DX remains “dev specifies values, it just works.”

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
    remains a plain folder driven by `orval` from the root. - Updated ESLint parserOptions.project to drop the child tsconfig path.
  - (Optional follow-up) Prune services workspace section in knip.json later.

- Single published package (simplify workspaces)
  - Removed root `workspaces` (only the root package is published).
  - Updated `generate` script to run Orval directly: `cd services/activecampaign && orval`.

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
  - Moved generator to app/config/openapi.ts; output to app/openapi.json; orval generation stable with local mutator forwarder.

- Introduced schema-first App class and baseEventTypeMapSchema; migrated representative endpoints to app.defineFunction; added runtime-widenable httpEventTypeTokens; aggregated Serverless/OpenAPI via app instance.

- Fix types/tests after App migration:
  - App: tighten eventTypeMapSchema typing; avoid undefined optional props under exactOptionalPropertyTypes; return ZodOpenApiPathsObject; cast serverless functions result.
  - wrapHandler: accept httpEventTypeTokens as string[]; simplify HTTP detection.
  - Tests: ensure env vars are set (not commented), provide unique slugs to avoid duplicate registration, remove unnecessary optional chaining and unused vars.
  - Outcome: typecheck and tests converge; ESLint passes for updated modules.

- DX polish (no any, internal casts):
  - App.defineFunction: remove all `any` by explicitly typing FunctionConfig and wrapHandler generics.
  - App.buildAllServerlessFunctions: return NonNullable<AWS['functions']> internally (downstream no cast).
  - OpenAPI get handler: simplify return typing; no unsafe assertions.