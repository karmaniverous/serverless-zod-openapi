# Development Plan

When updated: 2025-09-07T16:50:00Z

## Next up (near‑term, actionable)

1. Template/Docs polish
   - Run templates:typecheck and templates:lint to re‑verify the template
     workspaces after helper refactors. Address any drift (lint rules,
     tsconfig) and keep README instructions accurate.
2. Optional: build noise
   - Investigate reducing rollup-plugin-dts “Unresolved dependencies” warnings
     during stan:build by passing tsconfig paths or adjusting dts externals;
     treat as non‑blocking polish.

## Completed (recent)

- CLI & aggregators tests green:
  - register/add/init happy paths, idempotency, POSIX sorting (register).
  - watch debounce with coalescing; injectable watcher tests.
  - Serverless/OpenAPI aggregators: contexts → events/paths, operationId and
    tags; env extras mapping validated.
- Docs/OpenAPI/build/package exercised:
  - openapi document generation ok; packaging ok; lint/typecheck/tests ok.
- Templates README:
  - Added cross‑platform path hygiene note (toPosixPath guidance).
