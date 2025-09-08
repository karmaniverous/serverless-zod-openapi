# Development Plan

When updated: 2025-09-08T21:00:00Z

## Next up (near‑term, actionable)

1. Examples — continue seeding:
   - rest‑sqs (non‑HTTP) and rest‑step (non‑HTTP).
   - Keep each example minimal (init, one endpoint, run notes).
   - Cross‑link examples from the Recipes index.

2. Loop guard: verify install (standing)
   - Each loop, check for evidence of missed npm install; prompt if needed.

## Completed (recent)

- Examples: created examples area and rest‑only guide
  - examples/README.md (index and status)
  - examples/rest-only/README.md (step‑by‑step)
- Docs: added navigation pages and initial recipes
  - Why smoz? (docs-src/why-smoz.md)
  - 10‑minute tour (docs-src/tour-10-minutes.md)
  - Recipes index + subpages:
    - sqs, contexts-auth, custom-middleware, per-function-env, observability, troubleshooting  - typedoc.json updated to include new docs in order.
  - README quick links updated.
- Docs site plumbing:
  - Front matter added to overview/getting-started/middleware/templates/cli/contributing.
  - typedoc.json projectDocuments reordered; CHANGELOG last.
  - CLI code excluded from API reference ("src/cli/\*\*").
- CLI: add — path parameters
  - Specs like `rest/users/:id/get` supported.
  - Scaffolded openapi.ts includes path template hint and basic path parameters.
  - CLI docs updated with example and notes.
  - Normalization: accepts `:id`, `{id}`, `[id]`; creates `[id]` on disk; emits `{id}` in basePath/OpenAPI.
  - Docs updated with consumption examples and portability notes.
- Tests
  - Added a path-parameters test to src/cli/add.test.ts covering [id] directory, basePath 'users/{id}', and OpenAPI parameter hints.
  - Adjusted assertions to accept both single and double quotes in
    generated files (formatter-agnostic).
  - Refined parameters-array regex to match through the inner schema brace only, tolerating additional fields (e.g., description).- Optional pre‑commit recipe (docs)
  - Documented a lefthook snippet to run `smoz register` on staged endpoint changes
    and re‑stage generated registers (not enforced).
