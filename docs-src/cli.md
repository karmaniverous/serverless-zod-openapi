---
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
