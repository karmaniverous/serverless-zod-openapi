# Development Plan

When updated: 2025-09-03T00:00:00Z

## Next up
- App.ts orchestration slimming (follow‑through)
  - Keep App.ts as a thin orchestrator by pushing remaining helpers/types into src/app/\*.
  - Acceptance: App.ts ~≤ 200 LOC; strict TS and lint clean.
- Dependencies and binaries housekeeping
  - Re‑evaluate http-errors usage; remove if unused or keep and explicitly ignore in Knip.
  - Acceptance: scripts continue to work; Knip remains clean.

- Backlog triage
  - Review prior “Unused modules triage” list; confirm items are not present or add targeted tests/usages. Drop from plan if N/A.

## Completed (recent)

36. Public API surface + test fixtures alignment

- Trimmed public API: removed internal helpers from src/index.ts
  (asApiMiddleware, buildHttpMiddlewareStack, combine, httpZodValidator,
  shortCircuitHead, envBuilder functions, FunctionConfig, PropFromUnion,
  ZodObj, BaseOperation, stagesFactory and related types).
- Kept stable surfaces: App, baseEventTypeMapSchema, defineAppConfig (+types),
  detectSecurityContext, wrapHandler, HTTP customization types/utilities, and
  common types.
- Updated src/test fixtures to match /app shapes: dropped FN_ENV, switched
  global env exposure to REGION/SERVICE_NAME, added DOMAIN_CERTIFICATE_ARN to stages, and adjusted tests.
35. TypeDoc warnings cleanup (phase 2)

- Resolved remaining docs warnings by ensuring projectDocuments exists (CHANGELOG.md) and adding zod plugin integration; docs build shows 0 warnings.- Acceptance: TypeDoc build clean (no warnings).

34. TypeDoc cleanup (phase 1)

- Exported internal types (ApiMiddleware, Dict, RegEntry, RegistryEntry) so TypeDoc can include their references.- Fixed broken JSDoc links to wrapHandler and ShapedEvent.
- Acceptance: docs still warn for remaining items; follow-up remains.

33. TypeDoc categories and ordering

- Added @category tags across core modules (Public API, HTTP Middleware,  Customization, Config, Serverless, OpenAPI, Types).
- Set typedoc.json categorizeByGroup=false and categoryOrder with “Public API”
  first; alphabetical sort for stable ordering.
- Acceptance: docs build green; public content appears first within pages.

31. TypeDoc deep docs (expand)

- Switch TypeDoc to entryPointStrategy: "expand" with entryPoints: ["src"] so
  internal/exported module types are discoverable without top‑level re‑exports.
- Exclude tests and generated folders to reduce noise; keep excludeInternal: false
  so deep links resolve to internal pages.
- Acceptance: docs build remains green; deep links resolve.

30. Expose buildSafeDefaults helper

- Exported buildSafeDefaults from the customization barrel and top-level index.- Implemented as a thin alias for buildDefaultPhases; suitable for replace scenarios.
- Added unit tests to assert invariants and Zod step inclusion with schemas.
- Acceptance: typecheck/lint/test/build/package all green.

29. Knip — unlisted binaries resolved

- Added devDependencies: release-it, auto-changelog.
- Configured knip.json ignoreBinaries: ["plantuml"] to accept external tool.
- Acceptance: knip shows no “Unlisted binaries”.
- Follow-up: leave plantuml as an external dependency invoked by scripts.

28. Docs: HTTP middleware customization

- Added README section covering customization surfaces (app defaults/profiles,
  function profile/options/extend/transform/replace), merge order, step IDs,
  invariants, Zod enforcement, and examples for overrides, transforms, and
  phased replace.
- Acceptance: docs build remains green.
