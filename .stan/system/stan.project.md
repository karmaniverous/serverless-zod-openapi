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
- src/: consumer/demo stack to exercise the toolkit.

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
- Breaking (v0): remove free‑function envConfig/legacy builders; use App + registry surfaces.

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
