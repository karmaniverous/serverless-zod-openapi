# Development Plan

When updated: 2025-09-01T18:40:00Z

## Next up
- Split App.ts into SRP modules (phase 2)
  - Done: extract slug, HTTP tokens/guard, ZodObj alias.
  - Implemented: handlerFactory, buildServerless, buildOpenApi modules; App delegates to them.
  - Next:
    - Extract remaining registry logic into src/app/registry.ts (typed FunctionHandle).
    - Thin orchestrator: reduce src/config/App.ts to ≤200 LOC.
  - Acceptance:
    - App.ts ≤ 200 LOC; extracted modules compile with strict TS.
    - No import() type annotations; consistent-type-imports passes.
    - Handler type derived from FunctionConfig + app eventTypeMapSchema.
    - exactOptionalPropertyTypes respected; no undefined materialized.
    - serverless.ts uses app.buildAllServerlessFunctions() without casts; OpenAPI generator uses app.buildAllOpenApiPaths().
    - All scripts PASS (openapi, generate, typecheck, lint, test, package, stan:build).

## Completed (recent)

4. Lint & export hygiene
   - buildOpenApi: replaced “|| {}” with explicit in-operator check to satisfy no-unnecessary-condition.
   - slug: removed default export to avoid duplicate export; keep named export (deriveSlug) only.
1. Lint/types cleanup & OpenAPI handler
   - Removed import() type annotation in App.defineFunction handler signature; added top-level type import for Handler.
   - Constrained EventType to string keys; simplified httpEventTypeTokens init.
   - OpenAPI GET responseSchema -> z.any; handler uses top-level type import and Response alias.
   - Tests: adjusted wrapHandler tests to cast via unknown for shaped HTTP envelopes.

2. App SRP (phase 1)
   - Extracted slug helper and HTTP tokens/guard to src/app/.
   - App.ts updated accordingly; fixed no-unnecessary-condition.
   - Scripts PASS (typecheck, test, openapi, package, stan:build); lint clean on changed modules.

3. App SRP (phase 2 start)
   - Introduced handlerFactory, buildServerless, buildOpenApi modules.
   - App delegates wrap and builders to modules.