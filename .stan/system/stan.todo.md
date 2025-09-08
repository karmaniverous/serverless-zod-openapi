# Development Plan

When updated: 2025-09-08T22:10:00Z

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
         - Chokidar over app/functions/\*\*/{lambda.ts,openapi.ts,serverless.ts}.
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
   - Goals
     - Add a tiny in‑process HTTP server that mounts all HTTP routes defined by the registry and executes wrapped handlers.
     - Make inline the default for --local; keep offline as opt‑in (mode “offline”).
   - Tasks
     - Router assembly:
       - Call app.buildAllServerlessFunctions(); derive (method, path, handler string) for HTTP entries.
       - Dynamic import handlers via tsx (preserve tsconfig paths); map handler strings to functions.
       - Build a route table (method/path) and print it at startup.
     - Event fabrication:
       - Convert incoming Node HTTP request into APIGatewayProxyEvent (v1):
         headers (case‑insensitive), multiValue if present, query params, path params (native {id} segments), body string, isBase64Encoded flag if needed.
       - Respect JSON bodies: when content-type matches JSON (+vendor), parse body for eventSchema validation while preserving the raw body for serializer semantics.
     - Response mapping:
       - Send statusCode, headers, body from the wrapped handler’s HTTP envelope.
       - Ensure HEAD short‑circuit returns 200 {} with content-type set (per middleware policy).
     - Integration with dev queue:
       - When register writes, rebuild the route map (no process restart). For code‑only changes, rely on dynamic import semantics; accept initial full rebuild if needed for determinism.
     - Stage/env handling:
       - Reuse Phase 1 logic to seed process.env before server start.
     - Switch default:
       - Bare “--local” or “--local inline” selects inline; “--local offline” selects the plugin backend.
   - Acceptance criteria
     - “smoz dev --local” starts inline server, prints resolved port, stage, and the route table.
     - curl requests to listed routes return the same shaped responses as production wrappers (statusCode/headers/body; HEAD behavior; JSON content-type).
     - Route additions/removals after a register write reflect without killing the process.
     - Docs updated: inline is default, offline documented as opt‑in when APIG parity is required.
   - Risks / mitigations
     - TS dynamic import and path aliases: use project‑local tsx consistently; detect and surface helpful error messages if tsconfig/paths are missing.
     - Event shape parity: prioritize correctness for common cases (headers, path/query/body). Defer rare APIG quirks; document non‑goals.

## Completed (recent)

- Decision: adopt “smoz dev” orchestrator with local serving
  - Phase 1: remove “register --watch”, add “openapi”, implement dev with serverless‑offline backend.
  - Phase 2: implement inline HTTP dev server and make it the default for “--local”; keep offline as opt‑in mode.
- Docs: spell out durable requirements for dev/offline/inline in stan.project.md (flags, defaults, env/stage, queue, acceptance).

- Examples: created examples area and rest‑only guide
  - examples/README.md (index and status)
  - examples/rest-only/README.md (step‑by‑step)
- Examples: added rest‑sqs and rest‑step guides
  - examples/rest-sqs/README.md
  - examples/rest-step/README.md
- Docs: cross-linked examples from Recipes index
- Docs: structured Recipes with children front matter (Typedoc external docs)
- Docs: added Examples link to README quick links
- Docs: added navigation pages and initial recipes
  - Why smoz? (docs-src/why-smoz.md) - 10‑minute tour (docs-src/tour-10-minutes.md) - Recipes index + subpages:
    - sqs, contexts-auth, custom-middleware, per-function-env, observability, troubleshooting - typedoc.json updated to include new docs in order.
  - README quick links updated.- Docs site plumbing:
  - Front matter added to overview/getting-started/middleware/templates/cli/contributing.
  - typedoc.json projectDocuments reordered; CHANGELOG last.
  - CLI code excluded from API reference ("src/cli/\*\*").- CLI: add — path parameters
  - Specs like `rest/users/:id/get` supported.
  - Scaffolded openapi.ts includes path template hint and basic path parameters.
  - CLI docs updated with example and notes.
  - Normalization: accepts `:id`, `{id}`, `[id]`; creates `[id]` on disk; emits `{id}` in basePath/OpenAPI).
- Tests
  - Added a path-parameters test to src/cli/add.test.ts covering [id] directory, basePath 'users/{id}', and OpenAPI parameter hints.
  - Adjusted assertions to accept both single and double quotes in
    generated files (formatter-agnostic).
  - Refined parameters-array regex to match through the inner schema brace only, tolerating additional fields (e.g., description).- Optional pre‑commit recipe (docs)
  - Documented a lefthook snippet to run `smoz register` on staged endpoint changes
    and re‑stage generated registers (not enforced).
