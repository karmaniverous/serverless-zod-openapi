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
...
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
   │  ├─ typecheck.ts             # Produces typecheck.txt (TS diagnostics)
   │  └─ vitest.config.ts         # Fast context test config
   └─ openapi/generate.ts         # Optional helpers around spec generation
```

All these paths exist in this snapshot. :contentReference[oaicite:2]{index=2}

---

## 2) Scripts (Root)

...

    // Tests
    "test": "vitest",
    "test:run": "vitest run",

    // Services codegen (run in all workspaces and/or per workspace)
    "generate": "npm run -ws generate",
    "generate:ac": "npm run -w activecampaign generate",

    // Context (GPT debugging cycle)
    "context:archive": "tsx tools/context/archive.ts",
    "context:lint": "tsx tools/context/lint.ts",
    "context:test": "rimraf tools/context/out/test.json && vitest --config tools/context/vitest.config.ts",
    "context:typecheck": "tsx tools/context/typecheck.ts",
    "context:all": "npm run context:archive && npm run context:lint && npm run context:typecheck && npm run context:test",

},
}

````

### What they do

- **dev** – Start local API (Serverless Offline).
- **deploy/remove** – Deploy/remove the stack for the currently selected stage.
- **lint / lint:fix** – Repo-wide lint (generated code should be ignored by config).
- **format** – Prettier format pass.
- **typecheck** – Root project TS diagnostics (no emit).
- **test / test:run** – Vitest watch vs. CI mode.
- **generate / generate:\*** – Orval per-service codegen (see Services).
- **context:\*** – Produce the four GPT context artifacts under `tools/context/out/`:
  - `archive.tar`, `lint.json`, `typecheck.txt`, `test.json`

> If you prefer not to use `tsx`, compile the `tools/context...ontext/tsconfig.json`) and point these commands at the built JS.

---

## TypeScript config (tsconfig & path aliases)

This repo keeps TypeScript configuration **centralized** and uses simple, per-area aliases.

**At a glance**

- `tsconfig.base.json` (root): shared `compilerOptions` — `baseUrl: "./"`, `strict` flags, `declaration: true` + `emitDeclarationOnly: true`, `moduleResolution: "bundler"`, etc. It intentionally **does not** set `include`/`exclude` so projects can decide their own boundaries.
- Root `tsconfig.json`: extends the base and exposes a repo-root alias `@@/*` to `"*"`. It excludes build output and tooling output (`.serverless/**`, `node_modules/**`, `tools/context/out/**`). The root `typecheck` script runs **root-only** (`tsc --noEmit`).
- Per-package `tsconfig.json` (e.g., `packages/cached-axios`, `services/activecampaign`): extend the base and define `@/*` paths pointing to that area in the repo (e.g., `"@/*": ["packages/cached-axios/*"]`). This keeps imports concise inside each area without changing runtime behavior.

**Common imports**

- From the **root**: use `@@/…` to reference repo-rooted modules (e.g., `@@/src/...`).
- From a **package/service**: use `@/…` to reference that area’s own code per its `paths` mapping (e.g., in `services/activecampaign`: `@/src/...`).

**Notes**

- Because `baseUrl` lives in the base config (`"./"` at the repo root), `@/*` path entries in package configs are **repo-relative**. This matches the current setup.
- If you later introduce a **solution build** (`tsconfig.build.json`) with project references, prefer running it with `tsc -b tsconfig.build.json --noEmit` to type-check all projects together. (Currently the repo’s `typecheck` script uses root-only mode.)

---

## 3) Global & Stage Params

### How it works

- **Global defaults** live in `src/serverless/stages/global.ts`.
- **Per-stage overrides** live in `src/serverless/stages/{dev,prod}.ts`.
- **Stage type** is in `src/serverless/stages/stage.ts`.
- **Registry/export** is in `src/serverless/stages/index.ts`.
- **Runtime selection** is done by `src/serverless/stagesFactory...ll these files exist here. :contentReference[oaicite:4]{index=4}

### Add a new stage (step-by-step)

1. **Create** `src/serverless/stages/<name>.ts` exporting a `Stage`.
2. **Export** it from `src/serverless/stages/index.ts`.
3. **Mirror** it in tests: `test/stages/<name>.ts` (see **Prod vs Test Params**).
4. **Select** it when deploying (e.g., env var `STAGE=<name>`, or command-line flag your `stagesFactory.ts` understands).

---

## 4) Prod vs Test Params

- **Production params** (real infra, strict settings): `src/serverless/stages/prod.ts`.
- **Testing params** live under `test/stages/*` and **mirror** t...mirror exists in the repo. :contentReference[oaicite:5]{index=5}

**Create a new test stage fixture**

1. Copy a stage file from `src/serverless/stages/*` into `test/stages/*`.
2. Remove/relax anything that is production-only (e.g., actual ARNs or domain names).
3. Import it in tests so helpers can materialize a full stage config.

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

### Implementation notes

- Handlers are wrapped with a standard Middy stack (content-negotiation, error handling, event normalization).
- Zod schemas are the source of truth for runtime validation and type inference.
- Keep env small and explicit; inject only what you use (helps testability).

---

## 6) Middleware & Handler Framework

- The handler wrapper lives under `src/handler/*` and wires up core middleware.
- See `src/handler/detectSecurityContext.test.ts` for lifecycle behavior. :contentReference[oaicite:7]{index=7}

---

## 7) OpenAPI & Codegen

### How it works

- OpenAPI helpers live under `src/openapi/*`.
- For each external service, we use Orval to generate a typed client + Zod schemas into `services/<name>/generated/*`.
- Orval configs live next to each service (e.g., `services/activecampaign/orval.config.ts`).

**Regenerate a service**

```bash
# All services (workspaces-aware)
npm run generate

# Single service (example)
npm run generate:ac
````

The generated code is deterministic; check in the spec and the generator config, not the generated sources.

---

## 8) The “Context” Cycle (for GPT Debugging)

The `tools/context/*` scripts produce four artifacts to help a GPT assistant reason about your tree:

- `tools/context/archive.ts` → `archive.tar` (full repository snapshot)
- `tools/context/lint.ts` → `lint.json` (ESLint output)
- `tools/context/typecheck.ts` → `typecheck.txt` (TS diagnostics)
- `tools/context/test.ts` → `test.json` (Vitest output)

### Why TAR?

- It gives a canonical view of line endings and file names across OSes.
- It allows integrity checks (byte counts) before we claim anything about files.

### Example usage

```bash
# Produce everything (sequential — preserves deterministic ordering)
npm run context:all

# Or run them individually
npm run context:archive
npm run context:lint
npm run context:typecheck
npm run context:test
```

# Produces: archive.tar, lint.json, typecheck.txt, test.json

These end up under `tools/context/out/*` in this repo.

---

## 9) How We Validate the Snapshot (for GPT)

When sharing with a GPT assistant, we follow a strict policy:

- **Integrity-first TAR read** — enumerate every entry and verify bytes read equal size. If any mismatch occurs, abort and report details.
- **No inference from “…”** — never assume truncation from literal `...`/`…` in snippets.
- **Snippet elision policy** — if we omit lines for brevity, we use `[snip path:line-range]` and never insert `...`.

The following were confirmed present (not exhaustive here; see the context outputs and the tar manifest. :contentReference[oaicite:16]{index=16})

---

## 10) Contributing

- Use feature branches with meaningful names.
- Keep commits small and focused.
- Run `npm run lint:fix` and `npm test` locally before opening a PR.

---

## 11) License

MIT
