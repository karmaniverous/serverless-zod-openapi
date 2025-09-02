# Development Plan

When updated: 2025-09-02T15:50:00Z

## Next up

- HTTP customization modularization follow‑through - Add tests covering the compute layer (merge order, replace, invariants).
  - Ensure transformUtils helpers are covered (insert/replace/remove/find/getId).
  - Expand docs with “Step IDs and invariants” table and examples.
  - Acceptance: typecheck/lint/test/build/package all pass.

- HTTP customization follow‑through
  - Add unit tests for:
    - Transform helpers (insert/replace/remove) and getId tagging. - Invariant validation failures (head first; serializer last; shape before serializer; error-handler only in onError).
    - Zod enforcement on schemas present (remove zod-before/after → throws); accept custom tagged validators.
    - Merge order precedence (defaults → profile → fn overrides).
  - Documentation:
    - README: “HTTP middleware customization” section (defaults, surfaces, examples).
    - Typedoc: document HttpStackOptions, HttpProfile, FunctionHttpConfig, transform helpers, Step IDs.
  - Consider exposing buildSafeDefaults(options) helper for replace scenarios.
  - Acceptance: tests green; docs built; defaults unaffected for non-customizers.

- Knip cleanup and configuration - Suppress known false-positives:
  - Files referenced by Serverless via handler strings, not imports (e.g., app/\*_/_/handler.ts).
    Add an ignore pattern so Knip does not flag these as “Unused files”. - Serverless plugin packages used only by the CLI (e.g., serverless-… plugins) and
    cross-workspace dependencies (e.g., @karmaniverous/cached-axios used under services/activecampaign/).
    Add them to ignoreDependencies to reduce noise.
  - Keep http-errors under review; do not remove until confirmed unused at runtime.
  - Consider removing the redundant knip “entry” for app/config/openapi.ts per the hint.
  - Acceptance:
    - knip shows no “Unused files” for handler.ts paths and no “Unused dependencies” for the
      acknowledged plugin/tooling packages; overall knip passes cleanly.

- Unused modules triage (delete or justify)
  - Review and delete if truly unused (or add targeted tests/usages):
    - src/serverless/buildServerlessFunctions.ts
    - src/openapi/buildOpenApiPath.ts
    - src/modulePathFromRoot.ts
    - src/handler/wrapSerializer.ts
    - src/test/env.ts
    - src/test/middyLifecycle.ts
    - src/types/HttpEvent.ts
    - src/types/MakeOptional.ts
    - src/types/ShapedResponse.ts
    - src/handler/middleware/index.ts
    - src/handler/middleware/noop.ts
  - Acceptance: typecheck, lint, test, build (stan:build, package) all green with files removed.

- Dependencies and binaries housekeeping
  - If http-errors is not used, remove it from dependencies; otherwise, leave and ignore in Knip.
  - Either add release-it as a devDependency or ignore the “Unlisted binaries” warning in Knip.
  - Acceptance: scripts continue to work (release, diagrams), no new Knip warnings for these items.

- App.ts orchestration slimming (follow-through)
  - Keep App.ts as a thin orchestrator by pushing remaining helpers/types into src/app/\*.
  - Acceptance: App.ts ~≤200 LOC; strict TS and lint clean.

## Completed (recent)

23. Remove shims and make compute args exact-optional safe

- wrapHandler: dropped legacy/back-compat mapping for contentType and only
  pass computeHttpMiddleware options when defined (event/response/contentType,
  app, fn) to satisfy exactOptionalPropertyTypes.

24. Tests for HTTP customization

- Added compute tests: merge precedence, transform insertion, invariants violations,
  Zod enforcement (including custom tagged validators), and replace behavior.
- Added transformUtils tests: insert/replace/remove/find/getId on tagged steps.
- All scripts pass (typecheck/lint/test/build/package).

22. Split HTTP customization into modules and fix TS build

- Replaced monolithic httpStackCustomization with:
  - customization/types.ts, customization/defaultSteps.ts, customization/compute.ts - httpStackCustomization.ts now a barrel.
- Tightened transformUtils typing to API Gateway middleware and fixed invariants typing.
- Fixed malformed validateEventTypeMapSchemaIncludesBase call in App.ts.

21. HTTP middleware customization (foundation)

- Implemented phased stack builder with stable Step IDs and invariants.
- Added app-level http { defaults, profiles } and function-level http { profile, options, extend, transform, replace }. - Merge order: defaults → profile → fn.options → fn.extend → fn.transform → fn.replace.
- Zod enforcement: schemas present ⇒ require 'zod-before' in before and 'zod-after' in after; accepts custom tagged steps.
- Transform helpers exported: insertBefore, insertAfter, replaceStep, removeStep, findIndex, getId, tagStep.
- Integrated with wrapHandler via App → registry → handlerFactory plumbed http config.
- Defaults preserved for non-customized functions.
- Follow-ups: tests and docs (see “Next up”).

9. Function registration defaults & slug removal
   - Eliminated slug; functionName is now the unique registry key.
   - Added DefineFunctionOptions; App.defineFunction uses it. - Default functionName derived from path relative to app root with underscores.
   - App.create now accepts appRootAbs; app root derived in app.config.ts from its own location.

10. Path-based defaults
    - method/basePath continue to be inferred only when file is under endpoints root.
    - No change to OpenAPI: operationId remains derived from basePath + method; e.g. openapi_get.

11. Stage params input typing
    - Relaxed AppInit.stage.params input to Record<string, Record<string, unknown>>.
    - App composes effective schema as global.partial().extend(stage.shape) at runtime.

12. Legacy compile fix
    - Removed unresolved app-local import from src/handler/defineFunctionConfig.ts; bound to BaseEventTypeMap.

13. Remove obsolete app stages aggregator
    - Deleted app/config/stages/index.ts (unused; superseded by app/config/app.config.ts).

14. Baseline green across scripts
    - openapi, generate, typecheck, lint, test, stan:build, package all succeeded in latest run.

15. Knip config phase 1
    - Removed redundant entry (app/config/openapi.ts).
    - Ignored Serverless handler files (app/\*_/_/handler.ts).
    - Added ignoreDependencies for CLI/serverless-only and cross-folder deps to quiet false positives.

16. Unused modules triage — phase 1 (delete)
    - Removed unused files:
      - src/modulePathFromRoot.ts
      - src/handler/wrapSerializer.ts
      - src/app/slug.ts
      - src/config/serverlessConfig.ts
      - src/openapi/buildOpenApiPath.ts
      - src/serverless/buildServerlessFunctions.ts
      - src/serverless/intrinsic.ts
      - src/test/env.ts, src/test/middyLifecycle.ts
      - src/types/HttpEvent.ts, src/types/MakeOptional.ts, src/types/ShapedResponse.ts
      - src/handler/middleware/index.ts, src/handler/middleware/noop.ts
    - Expect Knip “Unused files” list to shrink accordingly; all scripts remain green.

17. Reintegrate wrapSerializer into HTTP middleware
    - Wrapped http-response-serializer’s JSON serializer with wrapSerializer for debug logging.

18. Documentation — Phase 1
    - README overhaul (SMOZ positioning, quick start, OpenAPI + Serverless aggregation, scripts).
    - TSDoc coverage across public API (modules exported by src/index.ts):
      App, defineAppConfig, baseEventTypeMapSchema, envBuilder helpers,
      wrapHandler and HTTP middleware, detectSecurityContext, serverless/openapi aggregators,
      and core types.
    - Acceptance: `npm run docs` succeeds; typedoc shows API pages;
      CI scripts (build/test/typecheck/lint/openapi/package) remain green.

19. Documentation — Phase 2
    - Add TSDoc to remaining helpers and utilities:
      DeepOverride, Merge, MakeRequired, PropFromUnion, HttpEventTokens,
      ShapedEvent (alt), app/registry, app/httpTokens, app/types.
    - Acceptance: `npm run docs` completes with same (or fewer) warnings;
      public API pages include the newly documented types/functions.

20. Documentation — Phase 3
    - Re-export internal/reference types from src/index.ts so Typedoc can include them:
      AppInit, MethodKey, BuildHttpMiddlewareStackOptions, HttpZodValidatorOptions,
      EnvAttached, StagesFactoryInput/Output, PropFromUnion, ZodObj, ShapedEvent (Handler),
      HandlerOptions, BaseOperation.
    - Acceptance: Typedoc warnings reduced for “referenced but not included”.
