/// Development Plan

# Development Plan

When updated: 2025-09-12T21:55:00Z

## Next up (near‑term, actionable)

1. smoz init UX:
   - (Optional) Expand smoz.config.json docs (examples) and add a short link from README.
2. CLI polish:
   - Consider reconciling root `-v/--version` with `dev -v/--verbose` in a future minor (non‑breaking) update.

## Completed (recent)

- CLI (init/dev): read optional smoz.config.json defaults (`cliDefaults.init` and `cliDefaults.dev.local`); honor when CLI flags omitted.
- CLI (root): add `-v, --version` alias for version output.
- CLI (init): remove legacy `--init` help option; add `-t, --template` and `-y, --yes` aliases; add `--no-install` override; default `--template` to `default`.
- Docs: update CLI/getting-started/templates and examples to reflect default template and new flags; mention smoz.config.json defaults.
- Templates:lint — add "@/..." alias to templates/default/tsconfig.eslint.json so
  ESLint resolves template-local imports; remaining errors should clear.
- Templates:lint — point ESLint at templates/default/tsconfig.eslint.json with
  local @karmaniverous/smoz mapping and set tsconfigRootDir in the template
  eslint.config.ts to resolve the project correctly.- Lint: remove unnecessary optional chaining in init.ts to satisfy
  @typescript-eslint/no-unnecessary-condition.
- CLI (init): fix parse/TS errors in init.ts (uncomment try for gitignore conversion; properly declare `installed` union; ensure function returns
  object).- Templates script: make templates:typecheck inject typed compilerOptions.paths
  mapping without unsafe assignments; lint/docs unblock.
- Templates: collapse to single “default”; fold project baseline into template root.
- CLI (init): resolve 'default' directly (no minimal mapping); create package.json when missing (no --init); fix optional rl typing; robust conflict policy resolution.
- Scripts: update templates:lint to use templates/default; inject temp tsconfig in templates:typecheck to map @karmaniverous/smoz.
- Tests: update init test to remove deprecated init option.
- Templates/CLI: add @serverless/typescript and @types.node to template
  devDependencies; prepare single default template migration; confirm caret version ranges pinned to majors.
- Templates: add jiti to devDependencies in full/minimal so ESLint can load TS flat configs downstream.
- Templates (minimal): add vitest devDependency and "test" script; seed templates/project/test/smoke.test.ts so tests pass out of the box.
- Templates (project): include tsdoc.json to support TSDoc tags consistently.
- Templates (project): add VS Code recommendations and settings with React filetypes in eslint.validate.
