# Global Requirements & Cross‑Cutting Concerns

> Source of truth for non-file-specific requirements. Keep business logic comments lean; record the intent here.

## 1) Logger shape

- **Requirement:** Anywhere a `logger` is accepted or passed, it **MUST** extend `ConsoleLogger` (i.e., be compatible with the standard `console` interface).
- **Implication:** Defaults should use `console`. Function and middleware options that accept `logger` must type it as `ConsoleLogger`.
- **Enforcement:** `makeWrapHandler` and HTTP middleware use `ConsoleLogger` and default to `console`.

## 2) OpenAPI specs (hand-crafted)

- **Requirement:** OpenAPI specs are **hand‑crafted**. Do **not** auto‑derive or make sections conditional based on Zod schemas.
- **Placeholders:** When a placeholder schema is needed, use `z.any()` and proceed; do **not** try to “teach” `zod-openapi` about conditional structures.

## 3) Testability of environment config

- **Requirement:** Files that depend on `@@/src/config/*` must be **mock‑friendly** with Vitest.
- **Pattern:** Avoid top‑level ESM imports that get evaluated before `vi.mock()` can apply. Instead, lazily import at runtime inside functions (no dynamic _type_ imports), so test mocks are honored.
