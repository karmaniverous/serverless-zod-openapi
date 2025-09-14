/// Development Plan

# Development Plan

When updated: 2025-09-14T18:49:00Z

## Next up (near‑term, actionable)

1. No immediate items. Monitor dev UX and template lint/typecheck in CI.

## Completed (recent)

25. Inline dev: enable tsconfig-paths in the tsx child (`--tsconfig-paths`)
    so "@/..." aliases in endpoint modules resolve at runtime. Keep register
    imports extensionless, POSIX-relative (TS-friendly) to avoid TS5097.
24. Inline dev: route detection fix — registers now use POSIX-relative import
    specifiers from app/generated to targets (no "@/" alias). Inline server
    successfully loads registers and routes (e.g., /openapi) resolve in dev.20. Dev UX (inline): fixed “__dirname is not defined” by resolving the packaged
    inline server from the repo root in the dev runner; works under tsx and the    built CLI. This also keeps fallback to serverless‑offline intact.
21. Inline server type hygiene: added Route.segs and Segment typing; updated
    match() signature to clear TypeScript errors and lint warnings.22. Templates lint: removed self‑ignoring "templates/**" from the template
    ESLint config so `npm run templates:lint` operates on template sources.
23. CLI polish: kept "-v/--version" for root version and switched `dev` verbose
    flag to "-V, --verbose". Updated docs accordingly.