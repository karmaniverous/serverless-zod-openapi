# SMOZ integration fixture (/app)

This directory contains a small, in‑tree example application used by CI to
exercise the end‑to‑end flow:

- `smoz register` → `app/generated/register.*.ts`
- OpenAPI generation → `app/generated/openapi.json`
- Serverless package (no deploy)

Notes:

- This fixture is not intended for deployment and is not part of the published
  npm package (only `dist` and `templates` are published).
- Identifiers are neutral:
  - service: `smoz-sample`
  - domains: `api.example.test` and `api.dev.example.test`
  - certificate ARNs: placeholders

Local quickstart:

```bash
# Generate registers and OpenAPI for the fixture
npm run openapi

# Package the service (no deploy)
npm run package
```

Intent:
- Keep a working integration surface in `main` to catch regressions in the
  registry, OpenAPI, and Serverless packaging flows.
