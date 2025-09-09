# Development Plan

When updated: 2025-09-09T00:00:00Z

## Next up (near‑term, actionable)
1. CLI: Phase 1 — dev loop (offline backend), remove “register --watch”, add “openapi”
   - Goals
     - Make “register” one‑shot (remove --watch).
     - Add “smoz openapi” (one‑shot) mirroring app/config/openapi.ts behavior.
     - Add “smoz dev” orchestrator with a single debounced task queue:
       register (if enabled) → openapi (if enabled) → offline child (restart).
   - Tasks
     - register command:
       - Remove Commander option for --watch; scrub help text.
       - Keep watch helper module as a shared utility for dev (do not delete).
       - Ensure tests that referenced register --watch are removed/updated.
     - openapi command:
       - New CLI subcommand that spawns “tsx app/config/openapi.ts” and mirrors npm script behavior (prettier formatting remains project‑local).
       - Minimal logging: “Generating OpenAPI document… Done!” with non‑zero exit on error.
     - dev command:
       - Commander wiring for flags:
         - -r/--register (default on), -R/--no-register
         - -o/--openapi (default on), -O/--no-openapi
         - -l/--local [mode] with allowed values: “offline” (Phase 1 default) or “inline” (Phase 2; accept but warn until implemented)
         - -s/--stage <name> (default: first non-“default” stage, else “dev”)
         - -p/--port <n> (default 0)
         - -v/--verbose
       - cliDefaults.dev loader:
         - Parse JSON/YAML config (stan.config.yml or smoz.config.\*) to read cliDefaults.dev and merge with flags (flags win).
       - Watcher + queue:
         - Chokidar over app/functions/\*_/_/{lambda.ts,openapi.ts,serverless.ts}.
         - Single debounced queue (~250 ms). Never overlap runs. Always execute in order: register → openapi.
         - On completion, print per‑task “Updated” vs “No changes”.
       - Offline mode:
         - Preflight run register/openapi (if enabled) before starting serverless-offline child.
         - Spawn project‑local serverless (node node_modules/serverless/bin/serverless.js offline start …).
         - Pass stage and port; default port selection (if 0) chooses a free port (scan or OS assignment).
         - Restart policy: if the last run wrote register files, kill and respawn the child (debounced). For pure code changes, rely on plugin handler reload; a conservative full restart is acceptable initially for determinism.
         - Stream stdout/stderr with “[offline]” prefix; on immediate failure, surface exit code and last N lines.
       - Stage/env handling:
         - Resolve stage as per defaults/flags. Before launching offline, seed process.env with concrete values from app.global.params and app.stage.params[stage].
         - Never leave ${param:…} placeholders in dev env.
       - Logs (verbose):
         - Print resolved stage, port, and task decisions at startup. Include a single “watching …” line.
   - Acceptance criteria
     - “smoz register” has no --watch; help reflects one‑shot use.
     - “smoz openapi” writes app/generated/openapi.json; exit 0 on success.
     - “smoz dev --local offline”:
       - Starts offline, prints stage/port, and keeps register/openapi fresh.
       - On register change (e.g., adding a new endpoint), offline restarts cleanly.
       - On code‑only edits (handler), request to the route returns updated behavior without stale artifacts.
       - Ctrl‑C exits both parent and child.
     - Docs updated: CLI page + quickstart snippets recommend “npx smoz dev --local”.
   - Risks / mitigations
     - serverless-offline drift: keep conservative restart logic; document optional plugin presence and that “inline” will be the default in Phase 2.
     - Windows spawn quirks: invoke node path to serverless.js rather than shelling a global “serverless”.

2. CLI: Phase 2 — inline HTTP dev server (default --local backend)
   - Types hygiene (aws-lambda imports; remove private redeclarations)
     - Goal
       - Ensure the inline server uses platform/public types rather than locally redeclared interfaces.
     - Tasks
       - src/cli/local/inline.server.ts:
         - Import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'.
         - Replace local HttpEvent/HttpResponse declarations with the public types:
           - evt: APIGatewayProxyEvent (v1) for now.
           - response: APIGatewayProxyResult.
           - When fabricating a minimal context, type as Context.
         - Keep any file-local structural helpers internal and unexported only when no public type fits (e.g., internal { re, keys } route matcher).
       - Consider a tiny “Route” alias referencing these AWS types for handler signatures rather than structural copies.
       - Do not export any private event/result interfaces from CLI modules.
     - Acceptance
       - Lint/typecheck/build succeed; no private HttpEvent

   - Acceptance
     - Minimal server responds for mounted routes; HEAD behavior covered by wrapper.

   - Tests
     - Add minimal integration tests (route mounting, 200/404, HEAD).
   - Default & docs
     - Make inline the default --local backend in dev; offline becomes opt‑in.
     - Update docs/examples accordingly.

## 20) Types hygiene — reuse public platform types (aws‑lambda) and SMOZ contracts

Policy

- NEVER privately redeclare types that already exist in public dependencies we ship or require (e.g., AWS Lambda events/results). Prefer importing well‑known types (from 'aws-lambda') or SMOZ’s exported contracts.
- Allowed: small, file‑local structural helpers for interim data (not exported), when no public type fits. Prefer narrowing with existing public types whenever possible.

Inline dev server (HTTP)

- Event/result types:
  - Use APIGatewayProxyEvent (v1) and APIGatewayProxyResult for the inline HTTP adapter’s request/response surface. Do not re‑declare these as local interfaces.
  - If/when v2 is supported, use APIGatewayProxyEventV2 and APIGatewayProxyStructuredResultV2 accordingly.
- Context:
  - Use Context from 'aws-lambda' when fabricating a minimal context object for handler invocation.
- Mapping guidance:
  - The inline adapter maps Node HTTP request → APIGatewayProxyEvent (v1), then calls the wrapped handler. The handler returns an APIGatewayProxyResult‑compatible envelope (statusCode/headers/body).
  - HEAD, content‑type, and JSON serialization semantics remain the responsibility of the SMOZ HTTP middleware; the adapter must pass the envelope through unaltered.

Other tokens (future adapters)

- For non‑HTTP tokens (e.g., SQS, SNS, EventBridge, Step), use the corresponding aws‑lambda types (SQSEvent, SNSEvent, EventBridgeEvent<…>, etc.) when a “smoz invoke” or other adapters are introduced. Never re‑declare local equivalents.

Acceptance

- Code under src/cli/\*\* must import AWS event/result/context types instead of defining local equivalents whenever those shapes are the intended surface.
- Reviewers should reject PRs that introduce local redeclarations of publicly available platform types.

## Completed (recent)

- CLI dev: resolve remaining ESLint issues in src/cli/dev.ts
  - Remove unnecessary nullish coalescing on opts.local.
  - Drop unnecessary String() conversions in logs.
  - Simplify always‑falsy conditional in child process close guard.
- CLI dev: fix typing and lint in src/cli/dev.ts
  - Store awaited inline launcher (Awaited<ReturnType<...>>).
  - Avoid passing async functions to setTimeout/process.on (wrappers).
  - Coerce log template expressions to strings; remove unused imports.
- Inline server: src/cli/local/inline.server.ts  - Import aws-lambda types; remove private event/result types.
  - Fix TS1003 parse error; complete response writing; print route table and port.
- Offline runner hygiene: src/cli/local/offline.ts
  - Replace nullish-coalescing with explicit checks; add restart/close; prefix logs.
