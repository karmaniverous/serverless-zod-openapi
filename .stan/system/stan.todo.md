# Development Plan

When updated: 2025-09-03T12:45:00Z

## Next up

0. Execution mechanics for directory changes (important)
   - Any tasks that reorganize the app tree (moves/renames/deletions) will be delivered as a precise file move plan (paths to move/rename/delete), not as patches. You will apply the plan in your IDE to avoid an “import blast area.”
   - After you confirm the moves are complete, I will follow up (if needed) with a small focused patch to adjust imports and wiring only.

1. Cruft cleanup (schema‑first alignment + remove redundancy)
   - Objective: Bring tests and implementation fully in sync with the schema‑first DX, then remove redundant code. No new CLI features or layout changes in this step.
   - Tasks:
     a. Base event mapping — single source of truth
     - Consolidate core/baseEventTypeMapSchema to a single module exporting:
       - baseEventTypeMapSchema
       - type BaseEventTypeMap = z.infer<typeof baseEventTypeMapSchema>
     - Include generic/common AWS events: rest, http, alb, sqs, sns, s3, dynamodb, kinesis, eventbridge, cloudwatch-logs, ses, cloudfront, firehose, iot-button, cognito-userpool, codepipeline.
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
   - Check-in: Pause here for validation before moving on. I will ping you with a concise diff/summary to confirm the repo is clean.

2. Directory conventions migration (author vs generated; file‑move plan first)
   - Objective: Adopt final layout without introducing CLI yet.
   - Tasks:
     a. Prepare a file move plan:
     - List each file to move/rename/delete to achieve the final structure:
       - Author code under app/functions/<eventType>/...
       - All generated artifacts under app/generated/
     - Deliver as a clear checklist (source → destination; deletions explicit).
       b. After you apply the move plan and confirm, introduce/wire:
     - serverless.ts to import './app/generated/register.functions' and './app/generated/register.serverless'
     - app/config/openapi.ts to import './app/generated/register.openapi' and write openapi.json to app/generated/openapi.json
       c. Remove app/\_root.ts and endpoints/\_root.ts; explicitly pass endpointsRootAbs as join(APP_ROOT_ABS, 'functions', '<token>') in lambdas.
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

(Fresh start — none)
