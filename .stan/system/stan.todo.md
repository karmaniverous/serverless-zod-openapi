/// Development Plan

# Development Plan

When updated: 2025-09-12T10:05:00Z

## Next up (near‑term, actionable)

1. Keep knip as-is (two expected “unused” files).2. (Optional) Consider expanding inline server coverage or adding “smoz invoke” for non‑HTTP tokens (SQS/Step) using aws‑lambda types.
## Completed (recent)

- Templates: /openapi handlers now import the canonical
  '@/app/generated/openapi.json' path. Ship a placeholder
  'app/generated/openapi.json' in both minimal and full templates so the
  endpoint returns a document out of the box. Remove the prior local
  openapi.stub.json in the minimal template to avoid diverging paths.

- CLI init: resolve templates base from the installed smoz package root
  instead of the caller project, so `--template <name>` works consistently
  (fixes “Template not found under <app>/templates”).- CLI init: fix TS2559 by passing options to packageDirectorySync
  (`{ cwd }` instead of a bare string).
- Templates: replace `z.any()` with `z.unknown()` for OpenAPI response schema
  to avoid unsafe return of any in handler stubs.
- Templates: satisfy `require-await` by adding a trivial await in OpenAPI
  handlers and making the SQS example handler non‑async.
- Templates (minimal): publish a public GET `/openapi` endpoint alongside
  `/hello` to make the OpenAPI doc accessible in dev (without importing
  generated files in the template).
- Templates (full): add a new “full” template showcasing:
  - Minimal /openapi handler now imports a local `openapi.stub.json` so users
    see a JSON response without editing code.
  - REST hello and /openapi endpoints, and
  - a non‑HTTP SQS example (tick with sample serverless extras).
- Docs: update CLI and Templates pages to advertise minimal and full, and  note minimal’s `/openapi` endpoint.
- Lint: export flat configs as plain arrays instead of using defineConfig;
  resolves TS2305 and runtime TypeError in ESLint/Knip/Typedoc builds.
- Lint: migrate deprecated tseslint.config to ESLint core defineConfig in
  root and template ESLint configs; clears @typescript-eslint/no-deprecated.
- Docs: align install/import instructions to use @karmaniverous/smoz, fix recipe imports, and clean minor TypeDoc glitches (http tokens, customization types).
- Build banner: treat “@/” and “@@/” as externals in rollup.config.ts so the stan:build banner no longer lists alias imports (only legitimate externals).
  Also mark aliases external in the DTS build to fully silence the unresolved banner during type bundling.

- Knip: ignore serverless-offline devDependency (spawned via CLI in dev loop)
  to avoid a false-positive “unused devDependency” report.

- Offline adapter: temp env fallback to avoid "undefined\temp\..." cache paths
  - Provide TMPDIR on all platforms and TEMP/TMP on Windows using os.tmpdir(). - Prevents toolchains (tsx/esbuild) invoked by serverless-offline from writing
    cache files under a literal "undefined\temp\..." path relative to the repo.
  - No behavior change otherwise; logs and restart semantics are unchanged.

- Inline server fixes: HEAD fallback and test env seeding
  - Server: allow HEAD to match GET routes so middleware can short-circuit to
    200 {} with Content-Type, aligning with production semantics.
  - Tests: seed SERVICE_NAME, REGION, and STAGE before spawning the inline
    server so the wrapped handler’s env parsing succeeds (avoids 500s).
  - Keeps behavior consistent across CI/local where provider-level env may not
    be present by default.

- Docs: CLI page reflects inline default
  - Primary example now uses `npx smoz dev`.
  - Note added that inline is default; `--local offline` is opt-in.

- Inline server test fixes (typing, CLI detection, lint)
  - Use existsSync to prefer project-local tsx only when available; fallback to
    PATH “tsx” on other systems. - Remove invalid cast to ChildProcessWithoutNullStreams; rely on ChildProcess. - Type stderr ‘data’ as Buffer; avoid any/unsafe member access.
  - Address template literal type complaints by coercing numbers with String().
  - Keeps the test robust across platforms and CI environments where local
    node_modules paths may differ.

- Offline adapter: widen env fallbacks and add diagnostics; ignore stray dirs; add offline guardrails
  - Add HOME (POSIX) and USERPROFILE/LOCALAPPDATA (Windows) fallbacks to os.tmpdir()
    in addition to existing TMPDIR/TEMP/TMP. Helps nested toolchains derive sane
    cache roots and prevents “undefined\temp\tsx-\*” paths.
  - Print a one-time “[offline] env snapshot” with { TMPDIR, TEMP, TMP, HOME,
    USERPROFILE, LOCALAPPDATA } when --verbose is set.
  - Add .gitignore pattern for “undefined/temp/tsx-\*”.
  - Add ‘custom.serverless-offline’ guardrails in serverless.ts (httpPort, noPrependStageInUrl).

- CLI dev: Phase 2 — finalize inline as default backend and add inline server tests
  - Tests: added src/cli/local/inline.server.test.ts to exercise the inline
    server end-to-end (route mounting 200 JSON at /openapi, HEAD 200 with Content-Type, and 404 for unknown routes). - Docs: updated Getting Started and 10-minute Tour to recommend
    `npx smoz dev` (inline is default) and note `--local offline` as opt-in.
  - Examples: added “Dev loop (optional)” to examples/README.md with the same
    guidance.
  - Note: Knip remains with 2 expected unused files
    (src/serverless/plugin.ts, src/cli/local/inline.server.ts).

- Dev loop: single-start inline + conditional restart
  - Run the initial register/openapi pass before launching the inline server so
    we don’t immediately restart on first boot (no double “listening” lines).
  - Restart inline only when something material changed:
    • registers wrote (route surface), or
    • openapi.json content changed.
  - Keep offline restart gated on registers (route surface) as before.
  - Improves UX without changing semantics; pinned ports (-p) remain honored.

- Dev loop: seed env from app config
  - Import `app/config/app.config.ts` and seed process.env for declared keys:
    • app.global.envKeys from stages.default.params (global),
    • app.stage.envKeys from stages[<stage>].params (selected stage).
  - Do NOT use Serverless “${param:…}” placeholders in dev; handlers must see real strings so Zod validation passes.
  - Do not override existing env; log seeded keys under --verbose.
  - Fallback to seeding STAGE only if import fails (keeps dev robust).

- Dev loop: lint fixes and minor guard adjustments
  - Guard inlineChild before restart (avoid unnecessary optional chaining).
  - Seed only primitive env values (string/number/boolean); skip non‑primitives
    to avoid “[object Object]” stringification and satisfy lint.
  - Remove unnecessary String() conversions on already‑string values to satisfy
    @typescript-eslint rules.

- CLI dev: restore debouncer timer and simplify inline restart
  - Reintroduce and type `timer` as `ReturnType<typeof setTimeout>` to fix
    TS2304 and satisfy no-unsafe-argument in clearTimeout/setTimeout. - Use `inlineChild?.restart()` to avoid unnecessary-condition warning.- CLI dev: tidy verbose logging and close guard in src/cli/dev.ts
  - Stringify non-string template values to satisfy restrict-template-expressions.
  - Use exitCode check in inline close() to avoid unnecessary-condition warning.

- Build: unify library and CLI under a single Rollup config
  - Add buildCli() to rollup.config.ts and include it in default export so
    `npm run build` emits dist/cli/index.cjs alongside library JS/DTS.
- Build: suppress Prettier unresolved warnings in CLI bundle
  - Treat 'prettier' as external in rollup.config.ts (dynamic import in CLI),
    keeping build banners clean while preserving runtime behavior.
- Chore: remove obsolete cli.rollup.config.ts after unifying builds to keep the
  tree clean and avoid future drift.
- Fix(cli): duplicate shebang in built CJS caused SyntaxError downstream
  - Remove source shebang from src/cli/index.ts and rely on Rollup banner in
    buildCli() so dist/cli/index.cjs contains a single "#!/usr/bin/env node"
    line.
