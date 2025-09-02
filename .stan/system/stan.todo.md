# Development Plan

When updated: 2025-09-02T17:15:00Z

## Next up

- HTTP customization modularization follow‑through - Add tests covering the compute layer (merge order, replace, invariants). - Ensure transformUtils helpers are covered (insert/replace/remove/find/getId).
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
  - Files referenced by Serverless via handler strings, not imports (e.g., app/\*/\_/handler.ts).
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
  - Acceptance: App.ts ~≤ 200 LOC; strict TS and lint clean.

## Completed (recent)

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

27. Knip cleanup (phase 2)

- Remove @karmaniverous/cached-axios from ignoreDependencies per knip hint.- Ignore CLI/config and future-use wrappers explicitly:
  - services/activecampaign/orval.config.ts
  - services/activecampaign/src/wrapped/field-values.ts
  - services/activecampaign/src/api/contacts/format.ts
- Result: knip shows only known “Unlisted binaries” notices.

25. Fix tests and lint around HTTP customization and transform utils

- customization/compute.test.ts: allow overriding the Accept header in the
  helper and use the vendor content type when asserting content-type
  precedence; prevents 406 NotAcceptableError.
- customization/compute.test.ts: remove unused getId import to satisfy lint.
- transformUtils.test.ts: add non-null assertion for array element access to
  satisfy noUncheckedIndexedAccess during typecheck/docs/build.

26. Knip: single workspace and ignore intrinsic helpers

- Refactored knip.json to a single workspace covering root and services.
- Kept src/serverless/intrinsic.ts for future use and added it to knip ignore.

24. Tests for HTTP customization

- Added compute tests: merge precedence, transform insertion, invariants violations, Zod enforcement (including custom tagged validators), and replace behavior.
- Added transformUtils tests: insert/replace/remove/find/getId on tagged steps.
- All scripts pass (typecheck/lint/test/build/package).
