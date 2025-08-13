#!/usr/bin/env bash
set -euo pipefail

say() { printf "➡️  %s\n" "$*"; }

has_git() { command -v git >/dev/null 2>&1; }

ensure_dir() { mkdir -p "$1"; }

# Move a single path with history if possible
safe_git_mv() {
  local src="$1" dst="$2"
  [ -e "$src" ] || return 0
  ensure_dir "$(dirname "$dst")"
  if has_git; then
    git mv "$src" "$dst"
  else
    mv "$src" "$dst"
  fi
}

# Merge contents of $src directory into $dst directory (preserve history)
merge_dir_into() {
  local src="$1" dst="$2"
  [ -d "$src" ] || return 0
  ensure_dir "$dst"
  shopt -s dotglob nullglob
  local item
  for item in "$src"/*; do
    local base
    base="$(basename "$item")"
    safe_git_mv "$item" "$dst/$base"
  done
  shopt -u dotglob nullglob
  # Remove empty src dir (from git if possible)
  if has_git; then
    # If directory was tracked, remove from index; ignore if not
    git rm -r --cached "$src" 2>/dev/null || true
  fi
  rmdir "$src" 2>/dev/null || true
}

# Flatten accidental nested tools/context/context → tools/context
flatten_nested_context() {
  if [ -d "tools/context/context" ]; then
    say "Flattening accidental 'tools/context/context' → 'tools/context'…"
    merge_dir_into "tools/context/context" "tools/context"
    rmdir "tools/context/context" 2>/dev/null || true
  fi
}

say "Creating target directories…"
ensure_dir tools/openapi
ensure_dir tools/context
ensure_dir openapi
ensure_dir src/handler/wrapHandler
ensure_dir src/handler/middleware
ensure_dir scripts

say "Moving OpenAPI generator and artifact (if present)…"
safe_git_mv "src/openapi/generate.ts" "tools/openapi/generate.ts"
safe_git_mv "src/openapi/openapi.json" "openapi/openapi.json"

say "Fixing any accidental nested context from earlier runs…"
flatten_nested_context

say "Moving dev-only context helpers…"
# If tools/context exists, MERGE; otherwise move whole directory.
if [ -d "context" ]; then
  if [ -d "tools/context" ]; then
    say "Merging 'context/*' into existing 'tools/context'…"
    merge_dir_into "context" "tools/context"
  else
    safe_git_mv "context" "tools/context"
  fi
fi

say "Moving tests out of src (if present)…"
if [ -d "src/test" ]; then
  # Merge if test/ already exists
  if [ -d "test" ]; then
    say "Merging 'src/test/*' into existing 'test'…"
    merge_dir_into "src/test" "test"
  else
    safe_git_mv "src/test" "test"
  fi
fi

say "Renaming handler/middleware/stack.ts -> buildStack.ts (if present)…"
safe_git_mv "src/handler/middleware/stack.ts" "src/handler/middleware/buildStack.ts"

say "Moving wrapHandler.ts into folder and keep stable re-export…"
safe_git_mv "src/handler/wrapHandler.ts" "src/handler/wrapHandler/index.ts"

say "Writing/Updating barrels to preserve import paths…"
# Barrel: src/handler/middleware/index.ts
cat > src/handler/middleware/index.ts <<'EOF'
/**
 * Public barrel for middleware utilities.
 * Preserves import stability after the reorg (stack.ts -> buildStack.ts).
 *
 * Example (unchanged):
 *   import { buildMiddlewareStack } from "@/handler/middleware";
 */
export { buildMiddlewareStack } from "./buildStack";
EOF

# Re-export file to preserve old import path for wrapHandler
cat > src/handler/wrapHandler.ts <<'EOF'
/**
 * Compatibility re-export to preserve the original import path:
 *   from "@/handler/wrapHandler"
 *
 * If you previously relied on a default export, add:
 *   export { default } from "./wrapHandler/index";
 * …but only if "./wrapHandler/index" actually has a default export.
 */
export * from "./wrapHandler/index";
EOF

say "Done ✅"
printf "\nNext steps:\n"
printf "  1) If you used a default export from '@/src/handler/wrapHandler', add to src/handler/wrapHandler.ts:\n"
printf "       export { default } from \"./wrapHandler/index\";\n"
printf "  2) (Optional) Update package.json openapi script to:\n"
printf "       tsx tools/openapi/generate && prettier -w openapi/openapi.json\n"
printf "  3) (Optional) Exclude test/** and tools/** in tsconfig.json build output.\n"
