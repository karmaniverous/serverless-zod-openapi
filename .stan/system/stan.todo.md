# Development Plan

When updated: 2025-09-08T20:05:00Z

## Next up (near‑term, actionable)

1. Examples & recipes (after plugin lands)
   - Seed an examples area (or separate repo) with three tiny apps:
     - rest‑only, rest + sqs (non‑HTTP), rest + step (non‑HTTP).
   - Author recipe pages:
     - SQS function example; contexts + Cognito authorizer; custom middleware insertion
       (insertAfter 'shape'); per‑function env (fnEnvKeys); observability (pino + requestId);
       troubleshooting (register lifecycle, Windows TS errors, serverless‑offline loop).
   - Positioning & tour pages:
     - “Why smoz?” (vs SST/NestJS/tsoa/bare Middy) and “10‑minute tour” (init → add → register → openapi → package → curl).

2. Loop guard: verify install (standing)
   - Each loop, check for evidence of missed npm install; prompt if needed.

## Completed (recent)

- Docs site plumbing:
  - Front matter added to overview/getting-started/middleware/templates/cli/contributing.
  - typedoc.json projectDocuments reordered; CHANGELOG last.
  - CLI code excluded from API reference ("src/cli/**").
- CLI: add — path parameters
  - Specs like `rest/users/:id/get` supported.
  - Scaffolded openapi.ts includes path template hint and basic path parameters.
  - CLI docs updated with example and notes.
- Optional pre‑commit recipe (docs)
  - Documented a lefthook snippet to run `smoz register` on staged endpoint changes
    and re‑stage generated registers (not enforced).