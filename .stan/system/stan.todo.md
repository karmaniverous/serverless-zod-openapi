# Development Plan

When updated: 2025-09-04T17:40:00Z

## Next up

0. Execution mechanics for directory changes (important)
   - Any tasks that reorganize the app tree (moves/renames/deletions) will be delivered as a precise file move plan (paths to move/rename/delete), not as patches. You will apply the plan in your IDE to avoid an “import blast area.”
   - After you confirm the moves are complete, I will follow up (if needed) with a small focused patch to adjust imports and wiring only.

1. Crust cleanup (schema‑first alignment + remove redundancy)
   - Objective: Bring tests and implementation fully in sync with the schema‑first DX, then remove redundant code. No new CLI features or layout changes in this step.
   - Tasks:
     a. Base event mapping — single source of truth
     - Consolidate core/baseEventTypeMapSchema to a single module exporting:
       - baseEventTypeMapSchema
       - type BaseEventTypeMap = z.infer<typeof baseEventTypeMapSchema>
     - Include generic/common AWS events: rest, http, alb, sqs, sns, s3, dynamodb, kinesis, eventbridge, cloudwatch-logs, ses, cloudfront, firehose, cognito-userpool.
     - Ensure defaultHttpEventTypeTokens remains in core/httpTokens.ts.
       b. Replace imports across code/tests
     - Replace imports from src/types/BaseEventTypeMap with the alias from core/baseEventTypeMapSchema.
     - Replace imports from src/types/HttpEventTokens with core/httpTokens.
     - Remove src/types/ShapedEvent.ts if unreferenced (migrate any usage to the generic Handler.ShapedEvent).
       c. Test architecture
     - Update tests to consume current schema-first surfaces; avoid legacy helpers.
     - Ensure compilation and test suites pass with only the schema-driven surfaces and current public API.
       d. Remove files
     - Delete src/types/BaseEventTypeMap.ts and src/types/HttpEventTokens.ts.
     - Delete src/types/ShapedEvent.ts if no longer referenced.
       e. Acceptances
     - Lint/test/typecheck/build all green.
     - Grep shows no imports of removed modules.
     - No behavior drift in public API; only internal references updated.
   - Check-in: Completed — repo green (typecheck/lint/test/build). Build warnings filtered for alias externals in Rollup.

2. Directory conventions migration (author vs generated; file‑move plan first)
   - Objective: Adopt final layout without introducing CLI yet.
   - Tasks:
     a. File move plan (apply first; no content changes): (APPLIED)
     - Move: app/endpoints/openapi/get/lambda.ts -> app/functions/rest/openapi/get/lambda.ts
     - Move: app/endpoints/openapi/get/handler.ts -> app/functions/rest/openapi/get/handler.ts
     - Move: app/endpoints/openapi/get/openapi.ts -> app/functions/rest/openapi/get/openapi.ts
     - Move: app/endpoints/event/activecampaign/post/lambda.ts -> app/functions/rest/event/activecampaign/post/lambda.ts
     - Move: app/endpoints/event/activecampaign/post/handler.ts -> app/functions/rest/event/activecampaign/post/handler.ts
     - Move: app/endpoints/event/activecampaign/post/openapi.ts -> app/functions/rest/event/activecampaign/post/openapi.ts
     - Move: app/step/activecampaign/contacts/getContact/lambda.ts -> app/functions/step/activecampaign/contacts/getContact/lambda.ts
     - Move: app/step/activecampaign/contacts/getContact/handler.ts -> app/functions/step/activecampaign/contacts/getContact/handler.ts
     - Delete: app/endpoints/\_root.ts (obsolete; endpointsRootAbs will be provided explicitly per token in follow‑up patch)
       b. After you apply the move plan and confirm, introduce/wire: (APPLIED)
     - serverless.ts to import app/functions side‑effect modules (later switch to app/generated/register.\* after CLI)
     - app/config/openapi.ts to import updated app/functions modules (later switch to register.openapi) and write openapi.json to app/generated/openapi.json
       c. Remove app/\_root.ts and endpoints/\_root.ts; explicitly pass endpointsRootAbs as join(APP_ROOT_ABS, 'functions', '<token>') in lambdas. (APPLIED)
       d. Seed empty app/generated/register.\*.ts so typecheck remains stable prior to generation.
       e. Acceptances
     - Repo builds and runs scripts with the new structure.
     - No stray references to the old app/endpoints pathing.

3. Templates authoring (packaged assets)
   - Objective: Prepare templates for the CLI to copy.
   - Tasks:
     a. templates/project: tsconfig, eslint (flat), typescript‑eslint, prettier, vitest, typedoc, scripts.
     b. templates/minimal: hello + openapi endpoints using app/functions layout; serverless.ts and openapi.ts wired to app/generated; app/config/app.config.ts with default httpEventTypeTokens ['rest','http'].
     c. Include templates/\*\* in package.json "files".
     d. Acceptances
     - A fresh copy of the template compiles (typecheck), lints cleanly, and the example endpoints can be packaged.

4. CLI skeleton and commands
   - Objective: Implement smoz CLI with init/register/add.
   - Tasks:
     a. smoz init
     - Copy templates/project + selected template into CWD; install deps (runtime + infra + dev stack in “full”); seed app/generated/register.\*.ts.
       b. smoz register
     - Scan app/functions/\*\*; generate app/generated/register.functions.ts, register.openapi.ts, register.serverless.ts (optional); format, idempotent writes.
       c. smoz add <eventType>/<segments>/<method>
     - Read httpEventTypeTokens from app/config/app.config.ts via project’s local tsx.
     - Generate lambda.ts + handler.ts (always) and openapi.ts only for HTTP tokens.
       d. Acceptances
     - Running init → register → openapi → package on a fresh project succeeds.
     - add fails with clear guidance if app.config.ts is missing or cannot be evaluated (install tsx).

5. Documentation updates
   - Objective: Align README and any developer notes with the new CLI workflow and directory conventions.
   - Tasks:
     a. README quick start with smoz init/register/add and the app/functions + app/generated layout.
     b. Note that httpEventTypeTokens live only in app.config.ts.
     c. VCS guidance: commit register.\*.ts; openapi.json typically ignored.
     d. Acceptances
     - Docs reference the new conventions consistently.

6. Optional follow-ups (post‑v1)
   - smoz register --watch
   - smoz doctor
   - “full” template publishing

## Completed (recent)

1. ESLint policy (safety rules)
   - Removed inline disables in lambdas; made no‑unsafe‑\* rules explicit in eslint.config.ts with a documented policy.
   - Added eslint-plugin-eslint-comments to require descriptions on any inline disable,
     forbid unlimited disables, and catch unused disables. Updated existing disables
     with clear justifications (types/DeepOverride, core/baseEventTypeMapSchema).

1. Crust cleanup (schema‑first alignment + remove redundancy)
   - Consolidated base event schema (fixed aws‑lambda types; kept Cognito generic with deprecation note). - Removed redundant types (BaseEventTypeMap interface, HttpEventTokens, legacy ShapedEvent helper, Merge). - Migrated imports to schema module; adjusted http resolution helper/test generics.
   - Public API exports schemas, not schema‑derived types.
   - Repo is green: typecheck/lint/test/build/package succeed.
   - Build output cleaned by filtering alias unresolved warnings in Rollup (no behavior change; externals preserved).
