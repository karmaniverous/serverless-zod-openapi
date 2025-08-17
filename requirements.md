# Global Requirements & Cross‑Cutting Concerns

> Source of truth for platform‑wide rules that affect multiple modules.
> If a file-level comment repeats one of these, remove the duplication and reference this document.

## 1) Logging Contract

- **Canonical type:** `ConsoleLogger` (see `lib/types/Loggable.ts`).
- **Everywhere** a `logger` is passed (function configs, wrappers, middleware, handler options), it **MUST** be typed as `ConsoleLogger`.
- Default logger is `console` (which satisfies `ConsoleLogger`).
- Handlers receive `logger` via `HandlerOptions`.

## 2) OpenAPI Request Bodies

- **Never** conditionally omit the `requestBody` or its `content.schema`.
- When a function has no specific `eventSchema`, use a neutral fallback: `z.object({})`.
- Rationale: `zod-openapi` cannot handle `undefined` `schema` values.

## 3) HTTP HEAD Semantics

- For HTTP handlers:
  - A `HEAD` request **always** returns `200` and an **empty JSON object** (`{}`).
  - The middleware/wrapper must **ignore** any business payload produced by the handler when `HEAD`.

## 4) Environment Schema Composition

- Function `env` is composed from **Global**, **Stage**, and optional **Function** keys:
  - `deriveAllKeys` (union) → `splitKeysBySchema` (partition) → `buildEnvSchema` (compose) → `parseTypedEnv` (parse).
- `buildEnvSchema` argument order is: `(globalPick, stagePick, globalParamsSchema, stageParamsSchema)`.

## 5) Typing & Style (TypeScript/Zod)

- **No** `any`.
- **No** defaulted generic type parameters.
- Prefer `z.input<Schema>` for event typing to reflect pre-transform shapes.
- Keep import order compatible with `eslint-plugin-simple-import-sort`.

## 6) HTTP Route Derivation

- Valid HTTP method keys are derived from `zod-openapi` `PathItem` **excluding** the helper key `'id'`.
- Non-HTTP functions must not expose HTTP-only options.
