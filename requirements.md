# Global Requirements & Cross-Cutting Concerns

> Source of truth for policies that apply across the repo. Keep file-specific “REQUIREMENTS ADDRESSED” blocks brief and link back here.

## 1) Logging Contract

- **HandlerOptions.logger** **MUST** satisfy the shared `ConsoleLogger` type (see `lib/types/Loggable.ts`) everywhere it is passed around—handlers, middleware, wrappers, serializers.
- Wrappers should default to `console` when no logger is injected.
- Do not re-declare ad‑hoc logger shapes; import and use `ConsoleLogger`.

## 2) OpenAPI Specs

- **Do not attempt to “generate” or restructure the hand-crafted OpenAPI objects.** Treat them as authoritative.
- When a request/response schema might be absent in code, **substitute a permissive placeholder** (e.g., `z.any()`) so types remain sound and `zod-openapi` isn’t given `undefined`.

## 3) HTTP Semantics

- For **HEAD** requests, ALWAYS return `200 {}` with the configured `Content-Type`, ignoring any business payload returned by the handler.
- Content negotiation: default `Content-Type` to `application/json` unless a function specifies otherwise.

## 4) Env Typing Pipeline

- Use `deriveAllKeys` → `splitKeysBySchema` → `buildEnvSchema(globalPick, stagePick, globalParamsSchema, stageParamsSchema)` → `parseTypedEnv`.
- `buildEnvSchema` **expects picks first** (arrays of keys), then schemas. Maintain this order everywhere.

## 5) Typing & Style

- **Never** use `any`; prefer `unknown` then narrow.
- **Never** default generic type parameters; rely on inference.
- Use `z.ZodType` (not deprecated `ZodTypeAny`).
- Follow `eslint-plugin-simple-import-sort` and project ESLint rules.

## 6) HTTP Method Typing

- When using `ZodOpenApiPathItemObject`, exclude helper keys like `'id'` from the method key union:
  ```ts
  type MethodKey = keyof Omit<ZodOpenApiPathItemObject, 'id'>;
  ```
