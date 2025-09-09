/// Development Plan

# Development Plan

When updated: 2025-09-09T00:00:00Z

## Next up (near‑term, actionable)
1. Keep knip as-is (two expected “unused” files).
2. (Optional) Consider expanding inline server coverage or adding “smoz invoke”
   for non‑HTTP tokens (SQS/Step) using aws‑lambda types.
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

- Inline server fixes: HEAD fallback and test env seeding
  - Server: allow HEAD to match GET routes so middleware can short-circuit to
    200 {} with Content-Type, aligning with production semantics.
  - Tests: seed SERVICE_NAME, REGION, and STAGE before spawning the inline
    server so the wrapped handler’s env parsing succeeds (avoids 500s).
  - Keeps behavior consistent across CI/local where provider-level env may not
    be present by default.

- Docs: CLI page reflects inline default
  - Primary example now uses `npx smoz dev`.
  - Note added that inline is default; `--local offline` is opt-in.

- Inline server test fixes (typing, CLI detection, lint)
  - Use existsSync to prefer project-local tsx only when available; fallback to
    PATH “tsx” on other systems.  - Remove invalid cast to ChildProcessWithoutNullStreams; rely on ChildProcess.  - Type stderr ‘data’ as Buffer; avoid any/unsafe member access.
  - Address template literal type complaints by coercing numbers with String().
  - Keeps the test robust across platforms and CI environments where local
    node_modules paths may differ.

- CLI dev: Phase 2 — finalize inline as default backend and add inline server tests
  - Tests: added src/cli/local/inline.server.test.ts to exercise the inline
    server end-to-end (route mounting 200 JSON at /openapi, HEAD 200 with
    Content-Type, and 404 for unknown routes).  - Docs: updated Getting Started and 10-minute Tour to recommend
    `npx smoz dev` (inline is default) and note `--local offline` as opt-in.
  - Examples: added “Dev loop (optional)” to examples/README.md with the same
    guidance.
  - Note: Knip remains with 2 expected unused files
    (src/serverless/plugin.ts, src/cli/local/inline.server.ts).

- CLI dev: restore debouncer timer and simplify inline restart
  - Reintroduce and type `timer` as `ReturnType<typeof setTimeout>` to fix
    TS2304 and satisfy no-unsafe-argument in clearTimeout/setTimeout.
  - Use `inlineChild?.restart()` to avoid unnecessary-condition warning.

- CLI dev: tidy verbose logging and close guard in src/cli/dev.ts
  - Stringify non-string template values to satisfy restrict-template-expressions.
  - Use exitCode check in inline close() to avoid unnecessary-condition warning.
