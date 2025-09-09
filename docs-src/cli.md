## /// Front matter

title: CLI
sidebar_label: CLI
sidebar_position: 5

---

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
```

Scans `app/functions/**` for:

- `lambda.ts` → register.functions.ts
- `openapi.ts` → register.openapi.ts
- `serverless.ts` → register.serverless.ts (non‑HTTP)

One‑shot, idempotent, POSIX‑sorted, formatted when Prettier is available.
For a live authoring loop that keeps registers (and OpenAPI) fresh, use `smoz dev`
instead of a register watcher.

## add

```bash
npx smoz add rest/foo/get
npx smoz add step/activecampaign/contacts/getContact
npx smoz add rest/users/:id/get
```

Scaffold:

- HTTP: lambda.ts, handler.ts, openapi.ts
- non‑HTTP: lambda.ts, handler.ts

Paths must follow the convention under `app/functions/<eventType>/...`.

Path parameters

- You can write params as `:id`, `{id}`, or `[id]`:
  - Accepted spec forms (equivalent): `rest/users/:id/get`, `rest/users/{id}/get`, `rest/users/[id]/get`.
  - On disk, folders are Windows‑safe: `app/functions/rest/users/[id]/get/*`.
  - In code, lambda.ts uses a native API path: `basePath: 'users/{id}'`.
  - The scaffolded `openapi.ts` includes a path parameters array and a short “Path template” hint (e.g., `/users/{id}`).

Consuming path parameters (eventSchema & handler)

- Validate only what you need; the HTTP stack normalizes v1 events so `pathParameters` is an object before validation.
- String id (e.g., UUID):

```ts
export const eventSchema = z.object({
  pathParameters: z.object({
    id: z.string().uuid(), // or z.string().min(1)
  }),
});

export const handler = fn.handler(async (event) => {
  const id = event.pathParameters.id; // typed via ShapedEvent
  return { ok: true } as const;
});
```

- Numeric id (coerce to number for handler convenience):

```ts
export const eventSchema = z.object({
  pathParameters: z.object({
    id: z.coerce.number().int().positive(),
  }),
});
```

Portability

- `:` is not allowed in Windows paths. The CLI uses `[id]` on disk and `{id}` in code/docs to remain portable while staying native to API Gateway/OpenAPI.

## dev

```bash
npx smoz dev --local inline
```

Long‑running dev loop that watches source files and runs, in order:

1. `register` (if enabled)
2. `openapi` (if enabled)
3. local HTTP backend actions (restart/refresh if applicable)

Flags (CLI wins over config defaults):

- `-r, --register` / `-R, --no-register` (default: on)
- `-o, --openapi` / `-O, --no-openapi` (default: on)
- `-l, --local [mode]` — `inline` (default) or `offline`
- `-s, --stage <name>` — stage name (default inferred, typically `dev`)
- `-p, --port <n>` — port (0 = random free port)
- `-v, --verbose` — verbose logging

Notes:

- Inline backend maps Node HTTP → API Gateway v1 event → wrapped handler → response.
  It prints a route table and the selected port at startup.
- Offline backend runs `serverless offline` in a child process; when the route surface
  changes (register writes), the child is restarted automatically.
- The loop seeds basic env (e.g., `STAGE`) and prints “Updated” vs “No changes”
  per task run; bursts are debounced.
