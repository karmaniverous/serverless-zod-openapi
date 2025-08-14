# README — api.johngalt.id

High-performance serverless API with:

- **Typed endpoints** (Zod + TS) and a **clean folder contract**
- **Stages** (global/dev/prod) with mirrored **test fixtures**
- **External services** (per-service codegen from OpenAPI with Orval)
- A **GPT-driven debugging cycle** powered by the **context scripts** under `tools/context/*`

> This README is step-by-step and includes copy-pasteable commands. Adjust script names if your root `package.json` differs.

---

## 1) Repo Map

```
.
├─ serverless.ts                  # Root Serverless stack / HTTP wiring
├─ eslint.config.ts               # Flat ESLint config (repo-wide; ignores generated)
├─ vitest.config.ts               # Test runner config (app)
├─ src/
│  ├─ endpoints/
│  │  └─ foo/get/                 # Example endpoint
│  │     ├─ env.ts                # Minimal, typed env contract for the handler
│  │     ├─ handler.ts            # Pure business logic
│  │     ├─ schema.ts             # zod request/response schemas
│  │     ├─ openapi.ts            # OpenAPI path/operation builder
│  │     └─ serverless.ts         # Route integration (Lambda / HTTP)
│  ├─ handler/                    # Core handler framework & middleware
│  ├─ openapi/                    # OpenAPI utilities and types
│  └─ serverless/                 # Stage system & helpers
│     ├─ stages/
│     │  ├─ global.ts             # Global params (shared defaults)
│     │  ├─ dev.ts                # Dev-stage overrides
│     │  ├─ prod.ts               # Prod-stage overrides
│     │  ├─ stage.ts              # Stage type definition
│     │  └─ index.ts              # Stage registry
│     ├─ stagesFactory.ts         # Resolves current stage from env + builds config
│     └─ intrinsic.ts             # IaC/intrinsic helpers
├─ services/                      # External API integrations (per service)
│  └─ activecampaign/
│     ├─ src/
│     │  └─ index.ts              # Curated, public wrapper for the app
│     ├─ generated/               # Orval output (axios/fetch client + Zod) — do not edit
│     └─ orval.config.ts          # Codegen config for that service
├─ test/                          # Test helpers & stage fixtures
│  ├─ stages/                     # Mirrors src/serverless/stages for tests
│  ├─ http.ts, env.ts, aws.ts     # Testing utilities & fakes
│  └─ middyLifecycle.ts           # Middleware lifecycle tests
└─ tools/
   ├─ context/
   │  ├─ archive.ts               # Produces archive.tar of the repo for GPT
   │  ├─ lint.ts                  # Produces lint.json
   │  ├─ test.ts                  # Produces test.json (Vitest)
   │  ├─ typecheck.ts             # Produces typecheck.json (TS diagnostics)
   │  └─ vitest.config.ts         # Fast context test config
   └─ openapi/generate.ts         # Optional helpers around spec generation
```

All these paths exist in this snapshot. :contentReference[oaicite:2]{index=2}

---

## 2) Scripts (Root)

> Use `npm run -l` to see your exact script names. The following is the **standard** set we recommend.

```jsonc
{
  "scripts": {
    // Dev & Deploy
    "dev": "serverless offline",
    "deploy": "serverless deploy",
    "remove": "serverless remove",

    // Quality
    "lint": "eslint . --ext .ts,.tsx --cache --cache-location .cache/eslint",
    "lint:fix": "npm run lint -- --fix",
    "format": "prettier -w .",
    "typecheck": "tsc -p tsconfig.json --noEmit",

    // Tests
    "test": "vitest",
    "test:run": "vitest run",

    // Services codegen (run in all workspaces and/or per workspace)
    "generate": "npm run -ws generate",
    "generate:ac": "npm run -w activecampaign generate",

    // Context (GPT debugging cycle)
    "context:archive": "node --loader ts-node/esm tools/context/archive.ts",
    "context:lint": "node --loader ts-node/esm tools/context/lint.ts",
    "context:test": "node --loader ts-node/esm tools/context/test.ts",
    "context:typecheck": "node --loader ts-node/esm tools/context/typecheck.ts",
    "context:all": "npm run context:archive && npm run context:lint && npm run context:typecheck && npm run context:test",
  },
}
```

### What they do

- **dev** – Start local API (Serverless Offline).
- **deploy/remove** – Deploy/remove the stack for the currently selected stage.
- **lint / lint:fix** – Repo-wide lint (generated code should be ignored by config).
- **format** – Prettier format pass.
- **typecheck** – Repo-wide TS diagnostics (no emit).
- **test / test:run** – Vitest watch vs. CI mode.
- **generate / generate:\*** – Orval per-service codegen (see Services).
- **context:\*** – Produce the four GPT context artifacts in `/mnt/data` or project root:
  - `archive.tar`, `lint.json`, `typecheck.json`, `test.json` (see **Context & GPT Cycle**). The referenced `tools/context/*` files are present in the repo. :contentReference[oaicite:3]{index=3}

> If you prefer not to use `ts-node`, compile the `tools/context/*` scripts once (e.g., with `tsc -p tools/context/tsconfig.json`) and point these commands at the built JS.

---

## 3) Global & Stage Params

### How it works

- **Global defaults** live in `src/serverless/stages/global.ts`.
- **Per-stage overrides** live in `src/serverless/stages/{dev,prod}.ts`.
- **Stage type** is in `src/serverless/stages/stage.ts`.
- **Registry/export** is in `src/serverless/stages/index.ts`.
- **Runtime selection** is done by `src/serverless/stagesFactory.ts`, which reads env and assembles the final stage object consumed by `serverless.ts`. All these files exist here. :contentReference[oaicite:4]{index=4}

### Add a new stage (step-by-step)

1. **Create** `src/serverless/stages/<name>.ts` exporting a `Stage`.
2. **Export** it from `src/serverless/stages/index.ts`.
3. **Mirror** it in tests: `test/stages/<name>.ts` (see **Prod vs Test Params**).
4. **Select** it when deploying (e.g., env var `STAGE=<name>`, or command-line flag your `stagesFactory.ts` understands).

---

## 4) Prod vs Test Params

- **Production params** (real infra, strict settings): `src/serverless/stages/prod.ts`.
- **Testing params** live under `test/stages/*` and **mirror** the structure of `src/serverless/stages/*`. Tests should **never** import production stage modules; they import from `test/stages/*` instead. This mirror exists in the repo. :contentReference[oaicite:5]{index=5}

**Create a new test stage fixture**

1. Copy `test/stages/dev.ts` → `test/stages/<name>.ts`.
2. Update values to reflect the new stage’s test-friendly configuration.
3. Include it in `test/stages/index.ts`.

---

## 5) Endpoints

### Folder contract

Each endpoint is under `src/endpoints/<resource>/<method>/` and contains:

- `schema.ts` – zod request/response schemas (runtime validation + TS inference).
- `env.ts` – minimal typed env needed by the handler (keeps deps explicit).
- `handler.ts` – pure business logic (no framework code).
- `openapi.ts` – builds OpenAPI path/operation.
- `serverless.ts` – integrates the handler with HTTP/Lambda.

An example endpoint exists at `src/endpoints/foo/get/*`. :contentReference[oaicite:6]{index=6}

### Create a new endpoint (step-by-step)

1. **Scaffold** a folder: `src/endpoints/<resource>/<method>/`.
2. **Write** `schema.ts` (zod request and response).
3. **Define** `env.ts` (what the handler needs: secrets, service clients, etc.).
4. **Implement** `handler.ts` (use middleware from `src/handler/middleware/*` if needed).
5. **Describe** it in `openapi.ts` (path, params, responses).
6. **Wire** it in `serverless.ts` (route, authorizer, timeout, etc.).
7. **Export** or reference the endpoint’s function from the root `serverless.ts` so it’s included in the stack; this entry file exists in the repo. :contentReference[oaicite:7]{index=7}
8. **Test** it (see Testing).

**Middleware & helpers**

- Middleware lives in `src/handler/middleware/*` (e.g., `httpZodValidator`, `shortCircuitHead`, `isMultipart`, `buildStack`, etc.). These are present with unit tests. :contentReference[oaicite:8]{index=8}

---

## 6) Services (External APIs)

Each external API integration is a **mini-package** under `services/<name>` with:

- `src/index.ts` — your **public wrapper** for the app (curate exports here).
- `generated/**` — **Orval outputs** (axios/fetch client + Zod schemas). Do not edit.
- `orval.config.ts` — per-service codegen config.

Example: `services/activecampaign/*` exists with `src/index.ts`, `orval.config.ts`, and a full `generated/` set. :contentReference[oaicite:9]{index=9}

### Create & provision a new service (step-by-step)

1. **Create the workspace**
   - `services/<name>/package.json`:
     ```json
     {
       "name": "<name>",
       "private": true,
       "scripts": { "generate": "orval --config ./orval.config.ts" }
     }
     ```
   - Ensure the root has `"workspaces": ["services/*"]`.

2. **Drop the spec & config**
   - Place the OpenAPI spec (e.g., `openapi.json`) in the service folder.
   - Create `orval.config.ts` to output the client + Zod into `generated/`:
     ```ts
     import { defineConfig } from 'orval';
     export default defineConfig({
       client: {
         input: 'openapi.json',
         output: {
           client: 'axios', // or 'fetch'
           mode: 'split',
           target: 'generated/api.ts',
           schemas: 'generated/models',
         },
         hooks: { afterAllFilesWrite: ['prettier -w generated'] }, // no lint here
       },
       zod: {
         input: 'openapi.json',
         output: {
           client: 'zod',
           mode: 'split',
           target: 'generated/api.ts',
           fileExtension: '.zod.ts',
         },
       },
     });
     ```

3. **Generate**
   - From root:
     ```bash
     npm run -w <name> generate
     # or regenerate all services
     npm run generate
     ```

4. **Write the wrapper**
   - `src/index.ts` should export a **narrow API** used by the app. Import the generated client & Zod internally, and keep app imports pointed only at `services/<name>/src/index.ts`.

5. **Secrets & env**
   - Surface tokens/URLs through the stage system and inject them via each endpoint’s `env.ts`.

> Linting policy: generated code is **ignored** by ESLint (see `eslint.config.ts`). Run Prettier on generation only. The repo contains `generated/**` for ActiveCampaign right now. :contentReference[oaicite:10]{index=10}

---

## 7) Testing

- **Runner**: Vitest (root `vitest.config.ts`). :contentReference[oaicite:11]{index=11}
- **Unit tests**: co-located in `src/**.test.ts` and under `src/handler/middleware/*.test.ts`.
- **Fixtures**: stage fixtures in `test/stages/*` mirror production stages. Don’t import `src/serverless/stages/*` from tests. These fixture files exist now. :contentReference[oaicite:12]{index=12}

### Test rules

- Mock **only non-local** dependencies (e.g., remote APIs). Prefer real modules inside the repo.
- Validate request/response shapes with **zod schemas** in endpoint tests.
- Use helpers in `test/http.ts`, `test/env.ts`, `test/aws.ts` for setup. Present in repo. :contentReference[oaicite:13]{index=13}

### Common commands

```bash
npm test           # watch
npm run test:run   # CI
npm run typecheck  # TS diagnostics (no emit)
```

---

## 8) Context & GPT-Driven Debugging Cycle

This project ships **context scripts** that produce a self-contained snapshot for a GPT pair-programming/refactor session:

- `tools/context/archive.ts` → `archive.tar` (full repo snapshot)
- `tools/context/lint.ts` → `lint.json` (ESLint output)
- `tools/context/typecheck.ts` → `typecheck.json` (TS diagnostics)
- `tools/context/test.ts` → `test.json` (Vitest summary)
- `tools/context/vitest.config.ts` → tuned config for the context run

All these files exist here. :contentReference[oaicite:14]{index=14}

### Why this helps

- GPT gets everything it needs to **reproduce and fix** failures.
- The assistant follows strict rules (integrity check, no fake ellipses, zero-`any`, etc.) and will **summarize changes before proposing patches**.

### One-shot run (recommended)

```bash
npm run context:all
# Produces: archive.tar, lint.json, typecheck.json, test.json
```

### Manual run (if you want each piece)

```bash
npm run context:archive
npm run context:lint
npm run context:typecheck
npm run context:test
```

### Upload & iterate (the cycle)

1. **Run** the context scripts → collect `archive.tar`, `lint.json`, `typecheck.json`, `test.json`.
2. **Upload** those four files to your GPT chat with the prompt:  
   “Please apply the repository’s **Prompt Instructions** and **Testing/Linting/TypeScript/Project Guidelines**.”
3. **Expect** the assistant to:
   - Verify archive integrity (size/read match).
   - Report a **Change Summary** and **Ellipsis Report**.
   - Analyze failing tests & lint errors, referring to **source** (not just tool strings).
   - Propose patches (no `any`, consistent imports, DRY).
4. **Apply** the proposed patches.
5. **Re-run** the context scripts and repeat until green.

> The `typecheck.json` in this snapshot shows **0 diagnostics**; use the same flow when there are failures. :contentReference[oaicite:15]{index=15}

---

## 9) Conventions & Guardrails

- **Imports**: The app imports **only** from each service’s `src/index.ts`, never from `generated/**`. Enforce with ESLint’s `no-restricted-imports`.
- **Generated code**: Do **not** lint; format with Prettier only; regenerate via Orval.
- **TypeScript**: No `any`; prefer inferred types; use Zod for runtime validation.
- **Stages**: Production config under `src/serverless/stages/*`; tests mirror under `test/stages/*`.
- **Middleware**: Compose via `src/handler/middleware/*`; keep handlers pure.

---

## 10) Quick Start (end-to-end)

```bash
# 1) Install
npm i

# 2) Generate external clients (example service)
npm run generate:ac
# or in all services
npm run generate

# 3) Run locally
npm run dev

# 4) Test & quality
npm test
npm run typecheck
npm run lint

# 5) Deploy (set your stage selector env first, e.g., STAGE=dev)
npm run deploy
```

---

## 11) FAQ

**Q: How do I add a new route?**  
A: Follow **Endpoints → Create a new endpoint** and wire it into the root `serverless.ts`.

**Q: How do I add a new stage?**  
A: Add `src/serverless/stages/<name>.ts`, export it in `index.ts`, mirror it in `test/stages/<name>.ts`, then deploy with that stage selected.

**Q: How do I add another external service?**  
A: Create `services/<name>`, add `orval.config.ts`, run `npm run -w <name> generate`, write `src/index.ts` wrapper, and inject secrets via stages.

---

# Appendix: Files observed in this snapshot

The following were confirmed present (not exhaustive here; see the repo map above). This is derived from `typecheck.json`’s file list and the tar manifest. :contentReference[oaicite:16]{index=16}

- `src/serverless/stages/{global,dev,prod,stage,index}.ts`, `src/serverless/stagesFactory.ts`, `src/serverless/intrinsic.ts`
- `src/endpoints/foo/get/{env,handler,openapi,schema,serverless}.ts`
- `src/handler/**/*` (middleware & tests)
- `services/activecampaign/{src/index.ts, orval.config.ts, generated/**}`
- `tools/context/{archive,lint,test,typecheck,vitest.config}.ts`
- Root: `serverless.ts`, `eslint.config.ts`, `vitest.config.ts`

## Services

Each service follows a consistent structure:

```
services/<service-name>/
  generated/   # OpenAPI-generated API clients (do not edit manually)
  src/
    api/       # Business-facing layer for the outer application
    wrapped/   # Wrapped generated endpoints (Zod validation + caching)
    http.ts    # Per-service axios defaults (baseURL, auth headers, etc.)
    api/config.ts # Service-specific cache config (buildConfig output)
```

### Service Architecture

- **generated/**  
  Output from [Orval](https://orval.dev/) based on the service's OpenAPI spec.
  Provides typed API functions and Zod schemas for validation.
  **Never imported directly in `api/` or tests** — only in `wrapped/`.

- **wrapped/**  
  Imports generated endpoints and wraps them with:
  - Zod v4 input validation
  - Shared cache helpers (`withQuery` / `withMutation`)
  - Service cache config for id/tag generation

- **api/**  
  The business interface for the outer application.
  - Composes wrapped endpoints to deliver complete entities
  - Normalizes data shapes
  - Implements business logic (e.g., joining multiple endpoint responses)

---

## Current Services

### ActiveCampaign (`services/activecampaign`)

Integrates with the [ActiveCampaign API](https://developers.activecampaign.com/reference).

- **Business API**: Contacts (create, retrieve, update, delete, search)
- **Cache-aware wrappers** for Contacts, Custom Fields, and Field Values
- Uses shared axios instance with in-memory caching

---

## Shared Packages

### `packages/axios`

Shared HTTP client & cache layer.
See [`packages/axios/README.md`](packages/axios/README.md) for usage.
