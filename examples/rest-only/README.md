# Example: REST only

A minimal REST example built from the packaged template.

Prerequisites

- Node 22.x
- A package manager (npm/pnpm/yarn/bun)

Steps

1) Create a fresh directory and initialize the template:
   ```bash
   mkdir -p /tmp/smoz-rest-only && cd /tmp/smoz-rest-only
   npx smoz init --template minimal --yes
   ```

2) Add a hello endpoint:
   ```bash
   npx smoz add rest/hello/get
   ```

3) Generate registers and OpenAPI:
   ```bash
   npx smoz register
   npm run openapi
   ```
   This writes `app/generated/register.*.ts` and `app/generated/openapi.json`.

4) Package with Serverless (no deploy):
   ```bash
   npm run package
   ```

5) Next steps (optional)
   - Serve the handler locally with your preferred workflow.
   - Deploy with your infrastructure conventions.

Path parameters (optional)

```bash
npx smoz add rest/users/:id/get
```

This creates:
- `app/functions/rest/users/[id]/get/*` (Windows‑safe)
- `basePath: 'users/{id}'` (native to API Gateway/OpenAPI)
- An OpenAPI parameters entry for `id` (string, required)

Troubleshooting

- If TypeScript path resolution fails on Windows, normalize separators:
  ```ts
  import { fileURLToPath } from 'node:url';
  import { toPosixPath } from '@karmaniverous/smoz';
  export const APP_ROOT_ABS = toPosixPath(
    fileURLToPath(new URL('..', import.meta.url)),
  );
  ```
- If “module not found” for `app/generated/register.*`, run:
  ```bash
  npx smoz register
  ```
