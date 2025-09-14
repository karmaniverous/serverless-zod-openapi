/// Development Plan

# Development Plan

When updated: 2025-09-14T19:30:00Z

## Next up (near‑term, actionable)

1. No immediate items. Monitor dev UX and template lint/typecheck in CI.

## Completed (recent)

27. Inline dev: Fix empty route table by loading the App from TS source at
    runtime (same module instance as registers) instead of a bundled import.
    This ensures registrations and route aggregation operate on the same App.
28. Inline dev (Windows): remove the `--tsconfig-paths` CLI flag when spawning
    tsx and rely on `TSX_TSCONFIG_PATHS=1` in the environment to enable
    tsconfig-paths. Fixes "C:\Program Files\nodejs\node.exe: bad option:
    --tsconfig-paths" seen during `smoz dev`.
29. Inline dev: enable tsconfig-paths in the tsx child (`--tsconfig-paths`)
    so "@/..." aliases in endpoint modules resolve at runtime. Keep register
    imports extensionless, POSIX-relative (TS-friendly) to avoid TS5097.
30. Inline dev: route detection fix — registers now use POSIX-relative import
    specifiers from app/generated to targets (no "@/" alias). Inline server
    successfully loads registers and routes (e.g., /openapi) resolve in dev.
31. Inline server type hygiene: added Route.segs and Segment typing; updated
    match() signature to clear TypeScript errors and lint warnings.
32. CLI polish: kept "-v/--version" for root version and switched `dev` verbose
    flag to "-V, --verbose". Updated docs accordingly.
