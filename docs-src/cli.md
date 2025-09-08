# CLI

The `smoz` CLI maintains registers, scaffolds functions, and initializes apps.

## Signature

```bash
npx smoz
```

Prints version, repo root, detected PM, and presence of key files.

## init

```bash
npx smoz init --template minimal --yes
```

Scaffolds a new app:

- Shared “project” boilerplate
- Selected template (default: minimal)
- Seeds empty register placeholders in `app/generated/`

Options:

- `--template <name>` — minimal|full (future)
- `--init` — write a minimal package.json if missing
- `--install [pm]` — install deps with npm|pnpm|yarn|bun
- `--yes` — no prompts
- `--dry-run` — show actions without writing

## register

```bash
npx smoz register
npx smoz register --watch
```

Scans `app/functions/**` for:

- `lambda.ts` → register.functions.ts
- `openapi.ts` → register.openapi.ts
- `serverless.ts` → register.serverless.ts (non‑HTTP)

Idempotent, POSIX‑sorted, formatted when Prettier is available.

`--watch` uses chokidar with a small debounce; “Updated” vs “No changes”
messages are expected.

## add

```bash
npx smoz add rest/foo/get
npx smoz add step/activecampaign/contacts/getContact
```

Scaffold:

- HTTP: lambda.ts, handler.ts, openapi.ts
- non‑HTTP: lambda.ts, handler.ts

Paths must follow the convention under `app/functions/<eventType>/...`.

## Tips

- Always run `npx smoz register` before packaging/deploying to ensure
  registers reflect current endpoints.
- Commit generated registers to keep typecheck stable in CI.
- Use `--watch` during endpoint authoring.
