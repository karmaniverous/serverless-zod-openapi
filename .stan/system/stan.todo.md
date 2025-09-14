/// Development Plan

# Development Plan

When updated: 2025-09-14T15:12:00Z

## Next up (near‑term, actionable)

1. CLI polish: evaluate short‑flag overlap between root `-v/--version` and
   `dev -v` (verbose). Draft a non‑breaking proposal and update help text if
   needed.

## Completed (recent)

5. Build(bundling): resolve "@/\*" alias at build time via @rollup/plugin-alias
   (maps to repo root) so published dist never contains alias specifiers; keep
   DTS paths in sync; remove prior src‑only assumption.
1. Templates: drop redundant `as const` from envKeys in
   templates/default/app/config/app.config.ts. Contextual typing preserves
   compile‑time checking; runtime validation remains in place.
1. Templates: align default params referenced by serverless.ts. Added
   ESB_MINIFY/ESB_SOURCEMAP (global) and DOMAIN_NAME/DOMAIN_CERTIFICATE_ARN
   (stage) to templates/default/app/config/app.config.ts with sensible dev defaults.
1. Templates: wire esbuild block in serverless.ts to use ESB*\* params and
   add README note documenting ESB*\_ and DOMAIN\_\_ param usage.
1. Templates: fix comments to reference ambient types at
   templates/default/types/registers.d.ts (not minimal).
