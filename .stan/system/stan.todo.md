# Development Plan

When updated: 2025-09-08T19:15:00Z

## Next up (near‑term, actionable)

1. Docs site plumbing (structure, not content)
   - Add front matter (title/sidebar_label/sidebar_position) to docs-src pages:
     overview, getting-started, middleware, templates, cli, contributing.
   - Reorder typedoc.json “projectDocuments” to: overview → getting-started → middleware → templates → cli → contributing → CHANGELOG (last).
   - Exclude CLI code from API reference: typedoc.json “exclude”: "src/cli/\*\*".

2. CLI: `smoz add` path parameters
   - Accept specs like `rest/users/:id/get`; reflect param hints in the generated openapi.ts
     (path template and short description). Update CLI docs accordingly.

3. Optional pre‑commit recipe (documented, not enforced)
   - Provide a commented lefthook snippet that runs `smoz register` when staged changes
     include `app/functions/**`, then re‑stages `app/generated/register.*.ts`. Avoid forcing hooks
     to prevent clashes with teams’ existing setups.

4. Examples & recipes (after plugin lands)
   - Seed an examples area (or separate repo) with three tiny apps:
     - rest‑only, rest + sqs (non‑HTTP), rest + step (non‑HTTP).
   - Author recipe pages:
     - SQS function example; contexts + Cognito authorizer; custom middleware insertion
       (insertAfter 'shape'); per‑function env (fnEnvKeys); observability (pino + requestId);
       troubleshooting (register lifecycle, Windows TS errors, serverless‑offline loop).
   - Positioning & tour pages:
     - “Why smoz?” (vs SST/NestJS/tsoa/bare Middy) and “10‑minute tour” (init → add → register → openapi → package → curl).

5. Loop guard: verify install (standing)
   - Each loop, check for evidence of missed npm install; prompt if needed.

## Completed (recent)

- Templates:lint (Windows verification): unified templates config stable; run completed without issues.
- Templates:typecheck (minimal): now green on Windows after rootDir/typeRoots
