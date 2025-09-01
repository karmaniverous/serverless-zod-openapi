# Development Plan

When updated: 2025-09-01T01:58:00Z

## Next up
- Knip cleanup and configuration
  - Suppress known false-positives:
    - Files referenced by Serverless via handler strings, not imports (e.g., app/\*\*/handler.ts).
      Add an ignore pattern so Knip does not flag these as “Unused files”.
    - Serverless plugin packages used only by the CLI (e.g., serverless-… plugins) and
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

9. Function registration defaults & slug removal
   - Eliminated slug; functionName is now the unique registry key.
   - Added DefineFunctionOptions; App.defineFunction uses it.
   - Default functionName derived from path relative to app root with underscores.
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
    - Ignored Serverless handler files (app/**/handler.ts).
    - Added ignoreDependencies for CLI/serverless-only and cross-folder deps to quiet false positives.