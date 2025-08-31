# STAN Development Plan (tracked in .stan/system/stan.todo.md)

When updated: 2025-08-31 (UTC) — Fix selection-sync test hoist; CLI root excess-args UX; snap snapshot honors includes/excludes.

<!-- validator moved to Completed (initial library). Integration into composition remains a separate track and will be planned when the composition layer is introduced in-repo. -->

- Long‑file monitoring and decomposition (Phase 3)

- Continue to monitor near‑threshold modules; propose splits if any trend toward or exceed ~300 LOC in future changes.

- Coverage follow‑ups
  - Ensure tests remain strong for src/stan/config/{discover/load/normalize/output}; consider small additional cases for load.ts branches as needed.
  - Target incremental gains over ~86% lines coverage as changes land.
  - Keep excludes limited to trivial barrels and types‑only modules.

Completed (recent)

- test(snap): fix selection-sync hoisting error in tar mock; move calls capture and vi.mock to module scope and reset in beforeEach. Resolves “ReferenceError: calls is not defined” and brings the suite back to green.
- fix(snap): pass repo config includes/excludes to snapshot writer. Prevents phantom diffs when nested sub‑packages (default‑excluded) are re‑included via config. Verified against Windows report where services/\*\* appeared in archive.diff.tar despite no content edits.
- fix(cli): friendly handling for excess root arguments — print concise message and help; avoid CommanderError stack dump.
- docs(system): FEEDBACK quick‑triage mapping for common git errors (path/strip/context/hunk hygiene). Reinforces existing rule to use `summary.changed` when `summary.failed` equals “(patch)”, and adds concise remedies for frequent failure snippets.

- fix(lint): replace require('node:fs').writeFileSync with a typed import in src/stan/config.load.extra.test.ts to satisfy no-require-imports and no-unsafe-\* rules; no runtime code changes. Tests and coverage remain green.
- tests(coverage): add targeted cases for config loading branches (devMode normalization from strings, patchOpenCommand default fallback, maxUndos normalization from string, invalid config guards for stanPath/scripts); small but meaningful coverage gain in src/stan/config/load.ts without touching runtime code.
  - Confirmed normalization surfaces via public loadConfig API.
  - Keeps excludes limited and focuses on high‑value branch coverage as planned.

- docs/system: ensure Markdown list structure survives Prettier
  - replace Unicode “•” pseudo‑bullets with proper nested list markers in design‑first section,
  - add explicit guidance to use standard Markdown list markers (“-”, “\*”, “1.”),
  - note inserting a blank line before nested lists when needed.

- tooling: centralize Prettier as single source of truth; set proseWrap: never and keep embeddedLanguageFormatting: auto; make ESLint plugin defer to Prettier config (no duplicated rule options).
- system: add Markdown formatting policy — no manual wrapping outside commit messages or code blocks; opportunistically unwrap/reflow when touching affected sections.

- system/docs: remove STAN‑repo special cases from the system prompt; direct all prompt updates to `<stanPath>/system/stan.project.md`; add STAN‑specific diagnostics guidance to the project prompt.
- fix(build): remove duplicate import in src/stan/run/archive.ts that caused TS2300 duplicate identifier errors (path/resolve)
- fix(diff): prevent packaged stan.system.md from appearing in archive.diff.tar for downstream repos by restoring the ephemeral monolith before computing the diff archive.
- docs: add badges, expand contributing guide, and flesh out FAQ
- refactor(system): streamline handoff format and remove legacy base64 warnings
- response‑format: default to patches only on first presentation; Full Listings only on FEEDBACK or explicit request; FEEDBACK replies omit commit message
- system: add “Dependency Bug Report” section with valid‑Markdown template (nested code examples; fence‑hygiene reminder)
- system: elevate fence hygiene (CRITICAL jump list, quick how‑to before Response Format, hard gate in checklist)
- bootloader: remove non‑loader guidance (fixed 10‑backtick note, ellipsis hygiene); keep loader + context‑mismatch guard only
- dependency failures: cross‑link to “Dependency Bug Report”
- tests/docs build: remove unused @ts-expect-error in config.normalize.test; ensure package.json in config.discover.test so discovery ascends correctly
- coverage(config): add unit tests for normalize, discover, and output helpers (this change set)
- selection precedence: config excludes > includes > .gitignore — code/tests/docs updated to reflect precedence
- response‑format validator (initial library + tests) available via @/stan/validate/response
- snap: stash/pop confirmations with isolated success test improve operator feedback

DX / utility ideas (backlog)

- CLI/automation:
  - `stan run --plan --json` and `stan -v --json` for tool integration.
  - `stan patch --check --report` to print an affected‑files/hunks summary.
  - Optional progress timers per phase (scripts/archives) with totals.
  - Archive summary line: file count, excluded binaries, large‑text flagged.

- Patch ergonomics:
  - Adaptive context: automatically widen context margins on git/jsdiff failure (re‑try with more context).
  - Add a small preflight lint that flags aggregated multi‑file diffs before composing the final message.
  - Editor integration: open patched files at first changed line (from hunk); support VS Code, Cursor, WebStorm templates via config tokens.
  - Better rejects UX: on failure, surface the new `<stanPath>/patch/rejects/...` root path explicitly and offer a one‑liner to open it.

- Docs & guidance:
  - FEEDBACK envelope “causes” mapping table in docs (path/strip/EOL/context) with suggested assistant remedies.
  - Quick “what to attach” heuristics in CLI output when archives are missing.
