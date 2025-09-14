/// Development Plan

# Development Plan

When updated: 2025-09-14T00:36:00Z

## Next up (near‑term, actionable)

1. CLI polish: evaluate short‑flag overlap between root `-v/--version` and
   `dev -v` (verbose). Draft a non‑breaking proposal and update help text if
   needed.

## Completed (recent)
1. Templates: drop redundant `as const` from envKeys in
   templates/default/app/config/app.config.ts. Contextual typing preserves
   compile‑time checking; runtime validation remains in place.
2. Templates: align default params referenced by serverless.ts. Added
   ESB_MINIFY/ESB_SOURCEMAP (global) and DOMAIN_NAME/DOMAIN_CERTIFICATE_ARN
   (stage) to templates/default/app/config/app.config.ts with sensible dev defaults.
3. Templates: wire esbuild block in serverless.ts to use ESB_* params and
   add README note documenting ESB_* and DOMAIN_* param usage.
4. Templates: fix comments to reference ambient types at
   templates/default/types/registers.d.ts (not minimal).