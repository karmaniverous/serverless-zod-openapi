# Global Requirements & Cross‑Cutting Concerns

> Durable, repo‑specific requirements. Keep business logic comments lean; record intent here.

## Contributor workflow: Directory/file changes

[snip .stan/system/stan.project.md:7–(many)]

## Templates: register placeholders policy

- Do not commit generated register placeholder files under templates (e.g., templates/_/app/generated/register._.ts). Generated paths are excluded in this repo and invisible to STAN and other contributors pulling the repo.
- Templates must typecheck in a clean clone without running CLI steps. Provide a single ambient declarations file per template that declares the three side‑effect modules so imports typecheck:
  - '@/app/generated/register.functions'
  - '@/app/generated/register.openapi'
  - '@/app/generated/register.serverless'
- For the minimal template this lives at: templates/minimal/types/registers.d.ts.
- Runtime placeholders are created in actual apps by `smoz init` and maintained by `smoz register`; templates should not ship runtime placeholders in app/generated.

## Templates: single default baseline, plugins, and manifests

- Collapse to a single “default” template as the REST‑only baseline (hello + /openapi + serverless.ts + openapi builder + dev/package scripts). Non‑HTTP flows are added via `smoz add` or found under `examples/`.
- Ship a real `package.json` inside the template directory; remove templates/.manifests. The template manifest:
  - Uses caret ranges pinned to known‑good majors (e.g., serverless ^4, serverless‑offline ^14).
  - Includes:
    - devDependencies: serverless, serverless‑offline, serverless‑apigateway‑log‑retention, serverless‑deployment‑bucket, serverless‑domain‑manager, serverless‑plugin‑common‑excludes, tsx, prettier, typescript, eslint (+ configs/plugins), vitest, typedoc, jiti, @serverless/typescript, @types/node, zod‑openapi.
    - dependencies: @middy/core, zod (runtime for handlers).
  - Adds scripts: `register`, `openapi`, `package`, `dev`, `dev:offline`, plus `typecheck`, `lint`, `lint:fix`, `test`, `docs`.
- The template serverless.ts mirrors the root repo’s minimal plugin set and example provider/custom blocks (parameters via ${param:…}):
  - plugins: serverless‑apigateway‑log‑retention, serverless‑deployment‑bucket, serverless‑domain‑manager, serverless‑plugin‑common‑excludes, serverless‑offline
  - custom: apiGatewayLogRetention, deploymentBucket, customDomain, serverless‑offline
  - provider: nodejs22.x, logs, tracing, IAM example, apiName/endpointType/stack tags, etc.

## smoz init: UX and behavior (v0, no back‑compat required)

- Remove `--init` flag. New default:
  - If `package.json` is missing, create one from the template.
  - If `package.json` exists, merge template `package.json` additively (deps/devDeps/peerDeps/scripts) into the target.
- Template path support:
  - `-t, --template <name|path>` accepts either a packaged template name (“default”) or a filesystem directory path to use as the template source.
- Conflict handling (non‑package.json files):
  - Interactive: prompt per conflict with options: Overwrite, Add example (write `<file>.example`), Skip. Provide “apply to all” and “apply to all remaining”.
  - Non‑interactive (`-y`): controlled by `cliDefaults.init.onConflict` (ask|overwrite|example|skip). Default for `-y` is `example`. Override via `--conflict overwrite|example|skip`.
- Installation:
  - With `-y`, perform install by default using the detected PM (npm|pnpm|yarn|bun). Override with `--no-install` or `--install <pm>`.
  - Without `-y`, prompt for install; in CI, use `-y` with explicit `--install` to control behavior.
- Aliases and version flag:
  - Add `-v, --version` to print CLI version.
  - Add `-t, --template` and `-y, --yes` aliases to `init`.
- Defaults file (optional):
  - Recognize `smoz.config.json` in the repository root:
    - `cliDefaults.init.onConflict`: ask|overwrite|example|skip
    - `cliDefaults.init.install`: auto|none|npm|pnpm|yarn|bun
    - `cliDefaults.init.template`: default (optional)
    - `cliDefaults.dev.local`: inline|offline (optional default for `smoz dev`)

## Integration fixture (/app)

[snip .stan/system/stan.project.md:(continues unchanged)]
