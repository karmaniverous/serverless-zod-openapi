/// Development Plan

# Development Plan

When updated: 2025-09-12T19:28:00Z

## Next up (near‑term, actionable)
1. smoz init UX:
   - Add external template dir support.
   - Implement conflict handling (overwrite/example/skip) with apply‑to‑all.
   - -y implies install (overridable).
   - Read cliDefaults from smoz.config.json (optional).
2. smoz init UX:
   - Remove --init option wiring in CLI help (keep behavior as implemented).
   - Add -t/-y aliases and -v to CLI help where missing.
3. Update docs (CLI/Templates) and tests (init) to the new defaults.

## Completed (recent)

- Lint: remove unnecessary optional chaining in init.ts to satisfy
  @typescript-eslint/no-unnecessary-condition.
- CLI (init): fix parse/TS errors in init.ts (uncomment try for gitignore
  conversion; properly declare `installed` union; ensure function returns
  object).- Templates script: make templates:typecheck inject typed compilerOptions.paths
  mapping without unsafe assignments; lint/docs unblock.
- Templates: collapse to single “default”; fold project baseline into template root.
- CLI (init): resolve 'default' directly (no minimal mapping); create package.json when missing (no --init); fix optional rl typing; robust conflict policy resolution.
- Scripts: update templates:lint to use templates/default; inject temp tsconfig in templates:typecheck to map @karmaniverous/smoz.
- Tests: update init test to remove deprecated init option.
- Templates/CLI: add @serverless/typescript and @types.node to template
  devDependencies; prepare single default template migration; confirm caret  version ranges pinned to majors.
- Templates: add jiti to devDependencies in full/minimal so ESLint can load TS flat configs downstream.
- Templates (minimal): add vitest devDependency and "test" script; seed templates/project/test/smoke.test.ts so tests pass out of the box.
- Templates (project): include tsdoc.json to support TSDoc tags consistently.
- Templates (project): add VS Code recommendations and settings with React filetypes in eslint.validate.
