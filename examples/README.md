# SMOZ Examples

This folder hosts small, focused examples you can run locally. Each example
is kept minimal and uses the SMOZ CLI to generate registers and OpenAPI.

Status

- rest-only: ready (instructions below and in `examples/rest-only/README.md`)
- rest-sqs: planned
- rest-step: planned

Quick start (rest-only)

1) Create a new folder outside this repository (or anywhere you prefer):
   ```bash
   mkdir -p /tmp/smoz-rest-only && cd /tmp/smoz-rest-only
   ```
2) Initialize a minimal app:
   ```bash
   npx smoz init --template minimal --yes
   ```
3) Add a hello endpoint:
   ```bash
   npx smoz add rest/hello/get
   ```
4) Generate registers and OpenAPI:
   ```bash
   npx smoz register
   npm run openapi
   ```
5) Package (no deploy):
   ```bash
   npm run package
   ```

Notes

- The template includes everything you need to typecheck and package. Read the
  comments in the generated files for guidance.
- The CLI `add` command supports native path parameters. For example:
  ```bash
  npx smoz add rest/users/:id/get
  ```
  This creates `app/functions/rest/users/[id]/get/*` on disk, emits
  `basePath: 'users/{id}'`, and adds an OpenAPI parameters entry for `id`.
