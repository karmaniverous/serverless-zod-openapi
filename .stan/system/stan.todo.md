# Development Plan

When updated: 2025-09-06T00:50:00Z

## Completed (recent)
- CLI lint polish (init): track dependency merge changes with a boolean flag in
  mergeAdditive; avoids unnecessary-condition while preserving behavior.
- CLI lint polish (init): normalize install option into `stringInstall` and
  compare against '' to avoid unnecessary-condition on length checks.
- CLI lint polish (init): derive pm (string or detected) and run install only
  when pm is defined; removes unnecessary-condition in install logic.
- CLI lint fix (init): resolve @typescript-eslint/no-unnecessary-condition by
  replacing a broad truthiness check on Object.keys(out).length with an explicit

  > 0 comparison in mergeAdditive. Keeps behavior identical and satisfies the > rule.- Remove eslint-plugin-eslint-comments across project and templates:
  - Dropped plugin from root and template ESLint configs. - Deleted leftover shim file: types/eslint-plugin-eslint-comments.d.ts - Removed devDependency from package.json. - Rationale: simplify lint stack; avoid noisy rules.

- Templates authoring: add minimal README to templates/project with
  conventions and common scripts.

- Template verification overlays & manifests:
  - Added templates/.check/tsconfig.minimal.json and eslint.minimal.config.ts
  - Added templates/.manifests/package.minimal.json and package.project.json

- CLI init enhancements:
  - Additive manifest merge into package.json (deps/devDeps/scripts)
  - Copy-if-absent with .example on conflicts (no content merges)
  - --install[=<pm>] with tiny safe detection; no auto-install by default
  - TypeScript and lint polish: spawnSync typing, literal return, and
    avoiding unnecessary nullish/optional checks
  - Follow-up fix: ensure `installed` variable is declared (newline) and
    replace one remaining optional-chain with a boolean guard
  - Final lint pass: remove two remaining optional chains in init (creation
    dryRun guard; install option read)
  - Resolve remaining lint warning by replacing broad truthiness check for
    install option with an explicit predicate (done).

## Next up

1. Lint zero (init)
   - Objective: eliminate the remaining ESLint error in src/cli/init.ts.
   - Steps:
     - Run: `npx eslint src/cli/init.ts -f unix` to confirm the exact node and
       line; current report indicates @typescript-eslint/no-unnecessary-condition.
     - Adjust the flagged conditional to avoid length-based truthiness or
       conditions that the rule can infer as always truthy/falsey.
     - Re-run: `npm run lint` (should report 0 errors).
   - Acceptance: `npm run lint` returns 0 errors/warnings.

2. Templates authoring (packaged assets)
   - Objective: robust starting baseline for new apps.
   - Remaining: a. (DONE) Add a minimal README snippet to templates/project.
   - Acceptance:
     - Fresh template copy compiles (typecheck), lints, tests (empty OK), and docs tooling loads.

3. CLI — verify register end-to-end
   - Build CLI (npm run cli:build).
   - Run register to generate app/generated/register.\*.ts from current app/functions.
   - Acceptance: “smoz -v” prints signature; register writes files idempotently and formats with Prettier.

4. Documentation updates
   - Update README Quick Start to use app/functions/\* paths (no app/endpoints).
   - Document CLI workflow (init/register/add) and generated files (app/generated/\*).
   - Note httpEventTypeTokens lives only in app/config/app.config.ts.
   - VCS guidance: commit app/generated/register.\*.ts; openapi.json generally ignored.
