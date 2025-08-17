# requirements.md

## 1) Logging Contract (Global)

- **HandlerOptions.logger**: MUST extend `ConsoleLogger` everywhere `logger` is passed.
  - Use the shared type: `type ConsoleLogger = Pick<Console, 'debug' | 'error' | 'info' | 'log'>`.
  - Do not invent ad‑hoc logger shapes.
  - Wrappers MUST always provide a `logger` to business handlers.

## 2) OpenAPI Specs (Global)

- OpenAPI path objects are **hand‑crafted**. Do **not** restructure or “generate”.
- When a request/response schema is intentionally “placeholder”, use **`z.any()`**.
- Do **not** make OpenAPI content conditional on the existence of a schema.
- Goal: Make the runtime & tooling **consume** the spec—do not modify its content model.

## 3) HTTP vs Non‑HTTP

- Only base HTTP tokens (`'rest'`, `'http'`) are wrapped with HTTP middleware (Middy).
- HEAD semantics:
  - Response MUST be **200** with **empty JSON object** body `{}`.
  - Business payloads must be ignored for HEAD.

## 4) Env Schema Composition

- Build runtime env schema from **global + stage** schemas and an allowlist of keys:
  - Union all keys → split by presence in global/stage schema → `pick` → compose.
- Functions MUST pass **array** key lists to the pick builder; avoid non‑array inputs.

## 5) TypeScript / Lint

- Target **zero** ESLint errors/warnings.
- Avoid unnecessary assertions/conversions (e.g., `String(x)`, `Number(x)` when already string/number).
- Prefer `z.ZodType` over deprecated `ZodTypeAny`.
