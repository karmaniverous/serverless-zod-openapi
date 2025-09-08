# Global Requirements & Cross‑Cutting Concerns

> Durable, repo‑specific requirements. Keep business logic comments lean; record intent here.

## Contributor workflow: Directory/file changes

- For moves/renames/deletions, assistant first proposes a file‑move plan (no diff).
- After you apply moves, assistant follows with a focused patch to repair imports/wiring only.

## 1) Logger shape

- Any accepted logger MUST satisfy ConsoleLogger (console‑compatible).
- Defaults use `console`.
- HTTP middleware and wrapper rely on ConsoleLogger.

## 2) OpenAPI specs (hand‑crafted)

- Specs are authored by hand; no auto‑derivation from Zod.
- When needed, use `z.any()` as placeholders.

## 3) Testability of environment config

- Avoid top‑level ESM imports from config paths; prefer lazy imports inside functions so `vi.mock()` works.
- No dynamic type imports.

## 4) @karmaniverous/cached-axios (rules we use)

- Config: define cache shapes with `ConfigInputSchema` + `buildConfig` (stable IDs/tags).
- Calls: `withQuery/withMutation` (or bound `cache.query/mutation`) with typed invalidation.
- Orval: use a local `services/activecampaign/src/orval.mutator.ts` that exports `orvalMutator`; reference via `override.mutator.path`.
- Env: AC_SERVER / AC_BASE_URL / AC_API_TOKEN supported (+ compatibility aliases).
- Validate inputs with generated Zod schemas; narrow unknowns explicitly under strict lint.

## 5) HTTP middleware stack policy (HTTP‑only, do not remove)

Order (must remain):

1. HEAD short‑circuit
2. header normalizer
3. event normalizer (APIGW v1)
4. content negotiation (JSON + vendor +json)
5. JSON body parser (no 415 on missing Content‑Type)
6. Zod validate (before/after); HEAD finalized before after‑validation
7. error expose (map validation to 400 if needed)
8. http‑error‑handler (uses logger)
9. CORS (credentials on, origin preserved)
10. preferred media defaults across phases
11. response shaper (+ enforce Content‑Type, string body)
12. response serializer (JSON + vendor +json)
    Acceptance:

- HEAD → 200 {} (skips response validation).
- Shaped/string bodies pass; others are shaped.
- Validation errors → 400; others exposed as set.

## 6) Repository intent and publishing

- lib/: publishable toolkit (wrapper, middleware, Serverless/OpenAPI helpers, config typing).
- app/: integration fixture to exercise the toolkit end‑to‑end (register → OpenAPI → package). See “16) Integration fixture (/app)”.

## 7) Config model (direction)

- Per‑function config inlines `eventSchema`/`responseSchema`.
- App config = event map schema + unified app settings (serverless defaults, env exposure).
- Builders consume the app + per‑function config directly.

## 8) App singleton & function registry

- App.create(schema+config) captures env metadata, stage artifacts, event‑map schema, and a registry.
- Register once per function; registry provides:
  - `handler(business)`, `openapi(baseOperation)`, `serverless(extras)`.
- Loaders:
  - register.functions.ts (all lambda)
  - register.openapi.ts (all openapi)
  - register.serverless.ts (non‑HTTP extras)
- Aggregation:
  - `buildAllServerlessFunctions()` derives HTTP events/handlers or uses extras; provider env from app; per‑function env via `buildFnEnv`.
  - `buildAllOpenApiPaths()` merges paths; opIds: `${slug}_${method}` (with context prefix for non‑public).

## 9) CLI (smoz) — essentials

Conventions

- Author code: app/config/app.config.ts; app/functions/<eventType>/...
- Generated: app/generated/register.\* + openapi.json
  Commands
- `smoz init`: scaffold app; seed empty registers; write serverless.ts + openapi script; (optionally) install deps.
- `smoz register`: scan and write side‑effect registers; idempotent; Prettier formatted.
- `smoz add <eventType>/<segments>/<method>`: scaffold endpoint; http/non‑http aware.
  Safety
- Always write to app/generated; idempotent; no partials.
- For TypeScript evaluation, spawn local `tsx` (print guidance if missing).
  VCS
- Teams often commit app/generated/register.\* to keep typecheck stable; openapi.json usually untracked.

## 10) Event tokens hygiene (durable)

- Single source: `baseEventTypeMapSchema` (rest, http, sqs, etc.).
- `defaultHttpEventTypeTokens` in core/httpTokens.ts.
- Remove legacy artifacts and tests that reference them.

## 8.5) App‑level function defaults (env keys)

- App.create optional: `functionDefaults.fnEnvKeys`.
- Registry merges defaults + per‑function keys (exclude globally‑exposed provider env).
- Test defaulting and merge behavior.

## 11) Routing & mapping policy

- One function per method/basePath; HEAD auto‑handled (do not duplicate).
- Multiple security contexts via httpContexts.
- Legacy aliases: prefer small wrappers or redirects; keep business logic in services.
- OpenAPI opIds stay one‑per‑route (context‑tagged).

## 12) Path normalization & portability

- Normalize to POSIX separators across authored/generated code.
- Templates export helpers (`toPosixPath`, optional `dirFromHere`).
- Windows/macOS/Linux parity for relative path behavior.

## 9.1) CLI register --watch

- Watch app/functions/\*\*/{lambda,openapi,serverless}.ts.
- Debounce ~200–300ms; “Updated” vs “No changes”.

## 9.2) Script chaining (guardrail)

- Chain `register` to avoid footguns, e.g.:
  - openapi: `register && tsx app/config/openapi && prettier`
  - package/deploy: `register && serverless ...`

## 13) Lint/format & templates scalability

- ESLint drives Prettier (`prettier/prettier: error`).
- Unified templates ESLint config (`templates/.check/...`) with project service discovery.
- Template typecheck script discovers `templates/*/tsconfig.json` and runs `tsc -p --noEmit`.
- Contributor note: run `npm run stan:build` once so `@karmaniverous/smoz` types resolve in templates.

## 14) Install guard (operator may miss "npm install")

- Each loop, check for signs of missing install:
  - No root node_modules/ or missing key folders (e.g., node_modules/zod).
  - Recent logs with module‑not‑found for known deps (zod, @middy/core, typescript, eslint, vitest, typedoc, etc.).
- If suspected, prompt user to `npm install` (or equivalent) at repo root, then re‑evaluate.
- Do not add code to paper over missing deps; remove any accidental shims after install.

## 15) Templates: register placeholders policy

- Do not commit generated register placeholder files under templates
  (e.g., templates/_/app/generated/register._.ts). Generated paths are
  excluded in this repo and invisible to STAN and other contributors pulling
  the repo.
- Templates must typecheck in a clean clone without running CLI steps.
  Provide a single ambient declarations file per template that declares the
  three side‑effect modules so imports typecheck:
  - '@/app/generated/register.functions'
  - '@/app/generated/register.openapi'
  - '@/app/generated/register.serverless'
    For the minimal template this lives at:
    templates/minimal/types/registers.d.ts.
- Runtime placeholders are created in actual apps by smoz init and maintained
  by smoz register; templates should not ship runtime placeholders in
  app/generated.

## 16) Integration fixture (/app)

- Purpose: keep a small, in‑tree application under /app to validate the end‑to‑end flow in CI
  (register → OpenAPI → package). This fixture is not intended for deployment.
- Policy:
  - Keep /app in main. Do not move it to a long‑lived branch (avoid bitrot and loss of CI coverage).
  - Rebrand to neutral identifiers:
    - service: smoz-sample
    - domains: api.example.test / api.dev.example.test
    - ARNs: placeholder strings (non‑sensitive)
  - Add /app/README.md stating:
    - “Integration fixture used by CI to exercise register → OpenAPI → package.”
    - “Not part of the published package; not intended for deployment.”
  - Ensure repository scripts continue to run against the fixture without deploy (package only).
  - The fixture must not affect the published npm package (files whitelist remains “dist”, “templates”).

## 17) Register freshness & enforcement

- Goal: eliminate stale register footguns without burdening teams’ hook setups.
- Preferred mechanism: Serverless Framework plugin
  - Provide a lightweight plugin that runs `smoz register` before Serverless package/deploy flows
    (v4: before:package:initialize and deploy‑related hooks).
  - Ship as a subpath export (e.g., `@karmaniverous/smoz/serverless-plugin`) and document adding it
    to `plugins` in serverless.ts.
- Optional mechanism: pre‑commit recipe
  - Offer a commented lefthook snippet that runs `smoz register` when files under `app/functions/**`
    changed, and stages updated `app/generated/register.*.ts`. Do not enforce; document as opt‑in
    to avoid conflicts with existing hook managers (husky/lefthook).
- Continue chaining `npm run register` into scripts that depend on fresh registers
  (typecheck/openapi/package) as an additional guard.

## 18) Documentation structure and navigation

- ## External doc pages (docs-src/\*.md) include a front matter block to provide titles and sidebar labels:
  title: Page Title
  sidebar_label: Short Label
  sidebar_position: N
  ***
- Typedoc ordering is explicitly set via typedoc.json “projectDocuments”:
  1. docs-src/overview.md
  2. docs-src/why-smoz.md
  3. docs-src/getting-started.md
  4. docs-src/tour-10-minutes.md
  5. docs-src/middleware.md
  6. docs-src/recipes/index.md (+ its subpages)
  7. docs-src/templates.md
  8. docs-src/cli.md
  9. docs-src/contributing.md
  10. CHANGELOG.md (last)
- Exclude CLI source symbols from the API reference to avoid confusion:
  - typedoc.json “exclude”: add "src/cli/\*\*"
  - Keep CLI usage documented on docs-src/cli.md.

## 19) CLI dev loop (register/openapi/dev) and local server modes

Goal

- Provide a single long‑running dev loop that keeps generated artifacts fresh and (optionally) serves HTTP endpoints locally.
- Reduce CLI surface: make “register” and “openapi” one‑shot commands; move watch orchestration into “dev”.

Command semantics

- smoz register
  - One‑shot only. Eliminate “--watch”.
  - Generates app/generated/register.functions.ts, register.openapi.ts, register.serverless.ts.
- smoz openapi
  - One‑shot OpenAPI generator (same behavior as the existing app/config/openapi.ts script).
  - Implementation can spawn “tsx app/config/openapi.ts” to preserve project‑local authoring.
- smoz dev (orchestrator)
  - Long‑running process that watches author sources, debounces bursts, and executes tasks in order:
    1. register (if enabled),
    2. openapi (if enabled),
    3. local serving concerns (restart/refresh if applicable).
  - Flags (short/long; precedence: CLI > cliDefaults.dev > hard defaults):
    - -r, --register / -R, --no-register (default: on)
    - -o, --openapi / -O, --no-openapi (default: on)
    - -l, --local [mode] (default: inline once available; see “Local modes”)
    - -s, --stage <name> (default: first non-“default” stage; fallback “dev”)
    - -p, --port <n> (default: 0 i.e., random free port)
    - -v, --verbose
  - Source watch set: app/functions/\*\*/{lambda.ts,openapi.ts,serverless.ts}. A single debounced queue (≈250 ms) must serialize tasks, never concurrent.

Local modes (HTTP only)

- Scope: --local targets HTTP endpoints only. Non‑HTTP (e.g., SQS, Step) are out‑of‑scope for this dev server; they will be exercised via future “smoz invoke”.
- Two backends:
  1. offline (serverless-offline):
     - Uses Serverless configuration to emulate API Gateway locally.
     - Start with: serverless offline start --stage <stage> --httpPort <port> (and any team defaults).
     - On “register wrote changes” (route‑surface change), fully restart the child process (debounced).
     - On pure code changes, rely on plugin’s handler reload if available; conservative restart is acceptable initially for determinism.
     - If plugin is missing, dev must fail over gracefully (see inline mode below) with a clear log message.
  2. inline (default once implemented):
     - A tiny in‑process HTTP server that maps incoming HTTP requests → APIGatewayProxyEvent (v1) → calls the wrapped handler → returns statusCode/headers/body.
     - Route table comes from app.buildAllServerlessFunctions() (method + path + handler mapping).
     - Event fabrication must include headers (case‑insensitive), query (single/multi), path params (native {id} segments), and raw body string. Respect content‑type and handle JSON request bodies.
     - HEAD requests short‑circuit per middleware policy; content‑negotiation and error mapping behave like production stack (handled by the wrapped handler).

Environment, stage, and port

- Stage defaulting:
  - Pick the first stage key from app.stages that is not “default”; fallback to “dev” if absent.
  - The selected stage name is visible via --stage and printed when dev starts.
- Env injection:
  - For the selected stage, seed process.env with concrete values derived from:
    - app.global.params (global) and app.stage.params[stage] (stage‑specific).
  - Do NOT use Serverless “${param:…}” placeholders in dev; handlers must see real strings so Zod validation passes.
- Port:
  - Default to port 0 (random free port). Print the resolved port and the route table on startup.

cliDefaults.dev (config)

- Extend stan.config.\* (or a smoz config) to allow dev defaults:
  cliDefaults:
  dev:
  register: true
  openapi: true
  local: inline # values: false|inline|offline
  stage: dev
  port: 0
  verbose: false
- Precedence: CLI flags > cliDefaults.dev > hard defaults.

Removal and compatibility

- Remove “smoz register --watch” (v0; no compatibility shims required).
- Scripts/docs/examples should recommend “smoz dev …” for authoring loops.

Acceptance requirements (behavioral)

- Register/openapi debounced queue:
  - A single source watcher queues tasks; no overlapping runs. Consecutive bursts coalesce; logs display “Updated” vs “No changes”.
- Offline local mode:
  - Pre‑launch: ensure register/openapi are fresh if enabled.
  - On register writes, restart the child process cleanly (SIGTERM + timeout; force kill if needed), preserving flags.
  - Bubble stdout/stderr with a visible “[offline]” prefix; propagate immediate failures with clear diagnostics.
- Inline local mode (once implemented):
  - Route table printed (method + path), port printed, requests are handled with parity to production middleware envelope (statusCode/headers/body).
  - Path params work with native “{id}” segments.
  - HEAD short‑circuit returns 200 {} with the configured content‑type.
  - JSON request body parsing follows dev server’s content‑type logic and produces the same shape the wrapped handler expects.

Non‑goals for inline mode (explicit)

- Do not emulate authorizers, websockets, or request templates.
- Do not replicate every API Gateway quirk; the goal is a fast loop that exercises handlers with the same SMOZ HTTP middleware semantics.

Docs expectations

- CLI docs must reflect:
  - register (one‑shot), openapi (one‑shot), dev (watch + optional local).
  - Flag tables and examples for local inline (default) and offline (opt‑in).
  - Examples updated to recommend “npx smoz dev --local”.
  - Note that non‑HTTP flows are not served by --local in v0.
