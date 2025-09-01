# Development Plan

When updated: 2025-09-01T19:25:00Z

## Next up

- Split App.ts into SRP modules (phase 2) - Done: extract slug, HTTP tokens/guard, ZodObj alias.
  - Implemented: handlerFactory, buildServerless, buildOpenApi modules; App delegates to them.
  - Implemented: registry extraction (src/app/registry.ts) with typed FunctionHandle.
  - App now delegates defineFunction and iterators to registry; proceed to thin orchestrator goal.
  - Next (finalize phase 2): reduce src/config/App.ts to ≤200 LOC by moving any remaining glue/types into src/app/types or local modules if needed.
  - Acceptance:
    - App.ts ≤ 200 LOC; extracted modules compile with strict TS.
    - No import() type annotations; consistent-type-imports passes. - Handler type derived from FunctionConfig + app eventTypeMapSchema.
    - exactOptionalPropertyTypes respected; no undefined materialized.
    - serverless.ts uses app.buildAllServerlessFunctions() without casts; OpenAPI generator uses app.buildAllOpenApiPaths().
    - All scripts PASS (openapi, generate, typecheck, lint, test, package, stan:build).

## Completed (recent)

9. App: parse serverless internally; move schema to src
   - Moved serverlessConfigSchema to src/config/serverlessConfig.ts.
   - App.Init.serverless now accepts raw input (schema input type) and is
     parsed in the constructor.

10. Stage params typing accepts global overrides
    - Changed AppInit stage.params type to include Partial<GlobalParams>
      alongside StageParams, resolving config TS errors.

11. Remove obsolete app stages aggregator
    - Deleted app/config/stages/index.ts (unused; superseded by
      app/config/app.config.ts).

12. Lint fix (App.ts)
    - Removed unused BaseOperation import to satisfy
      @typescript-eslint/no-unused-vars).

13. App adopts registry.ts (delegation)
    - Replaced internal Map-based registry with src/app/registry.ts.
    - defineFunction forwards to registry; build functions iterate registry.values(). - Eliminates duplication and clears knip “unused file” for registry.
14. Lint & export hygiene
    - buildOpenApi: replaced “|| {}” with explicit in-operator check to satisfy no-unnecessary-condition.
    - slug: removed default export to avoid duplicate export; keep named export (deriveSlug) only.5. Registry extraction
    - Introduced src/app/registry.ts encapsulating function registration and storage.
    - App delegates registration to registry; builders iterate via registry.values().
15. Lint/types cleanup & OpenAPI handler
    - Removed import() type annotation in App.defineFunction handler signature; added top-level type import for Handler.
    - Constrained EventType to string keys; simplified httpEventTypeTokens init. - OpenAPI GET responseSchema -> z.any; handler uses top-level type import and Response alias.
    - Tests: adjusted wrapHandler tests to cast via unknown for shaped HTTP envelopes.

16. App SRP (phase 1)
    - Extracted slug helper and HTTP tokens/guard to src/app/.
    - App.ts updated accordingly; fixed no-unnecessary-condition.
    - Scripts PASS (typecheck, test, openapi, package, stan:build); lint clean on changed modules.

17. App SRP (phase 2 start)
    - Introduced handlerFactory, buildServerless, buildOpenApi modules.
    - App delegates wrap and builders to modules.
