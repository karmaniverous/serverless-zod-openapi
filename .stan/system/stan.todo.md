/// Development Plan

# Development Plan

When updated: 2025-09-14T15:36:00Z

## Next up (near‑term, actionable)

1. CLI polish: evaluate short‑flag overlap between root -v/--version and
   dev -v (verbose).
   - Options:
     - Keep -v for version only; use -V or --verbose for verbosity.
     - Or require --verbose (no short flag) to avoid ambiguity.
   - Non‑breaking requirement: "smoz -v|--version" remains unaffected.
   - Update help text and CLI tests accordingly once an option is chosen.

## Completed (recent)

6. OpenAPI builder alignment (reference ↔ template): reference now uses
   namespace+void for register import and package-directory for root
   resolution; template now uses default imports for fs-extra/path, removed
   extra pkgDir guard, and unified servers/info defaults to match reference.
7. Build(bundling): resolve "@/\*" alias at build time via @rollup/plugin-alias
   (maps to repo root) so published dist never contains alias specifiers; keep
   DTS paths in sync; remove prior src‑only assumption.
8. Templates: drop redundant `as const` from envKeys in
   templates/default/app/config/app.config.ts. Contextual typing preserves
   compile‑time checking; runtime validation remains in place.
9. Templates: align default params referenced by serverless.ts. Added
   ESB_MINIFY/ESB_SOURCEMAP (global) and DOMAIN_NAME/DOMAIN_CERTIFICATE_ARN
   (stage) to templates/default/app/config/app.config.ts with sensible dev defaults.
10. Templates: wire esbuild block in serverless.ts to use ESB\*_ params and
    add README note documenting ESB_\_ and DOMAIN\_\_ param usage.
11. Templates: fix comments to reference ambient types at
    templates/default/types/registers.d.ts (not minimal).
