/// Development Plan

# Development Plan

When updated: 2025-09-12T15:25:00Z

## Next up (near‑term, actionable)

1. Keep knip as-is (two expected “unused” files).
2. (Optional) Consider expanding inline server coverage or adding “smoz invoke” for non‑HTTP tokens (SQS/Step) using aws‑lambda types.

## Completed (recent)

- Templates: add jiti to devDependencies in full/minimal so ESLint can load TS flat configs downstream.
- Templates (minimal): add vitest devDependency and "test" script; seed templates/project/test/smoke.test.ts so tests pass out of the box.
- Templates (project): include tsdoc.json to support TSDoc tags consistently.
- Templates (project): add VS Code recommendations and settings with React filetypes in eslint.validate.