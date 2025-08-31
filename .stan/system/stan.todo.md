# Development Plan

When updated: 2025-08-31T01:45:00Z

## Next up

- Re-run: generate, typecheck, lint, test, package; paste outputs and report deltas.
- Review Knip output after config changes; further refine entries/ignores if
  any remaining false positives (consider ignoring unused experimental helpers).

## Completed (recent)

- HTTP middleware: restore rich pipeline (header/event normalization, content
  negotiation, conditional JSON body parsing, Zod validator, error exposure +
  http-error-handler, CORS, response shaping, serializer) in buildHttpMiddlewareStack.
- ESLint CLI: restore TypeScript parser and set explicit parserOptions.project
  (root + services/activecampaign) so type-aware rules (e.g., no-unsafe-return)
  surface in npm run lint the same as in VS Code.
- Knip: ignore dynamically referenced serverless handlers and non-packaged step
  functions; ignore specific AC helpers kept intentionally to reduce false positives.
- Lint: fix no-unsafe-assignment in lib/handler/middleware/middleware.test.ts
  by typing JSON-parsed bodies as unknown.
- Knip: convert to workspace-scoped config; add root entries (serverless.ts,
  lib/openapi/generate.ts), service entry (services/activecampaign/src/index.ts),
  and ignore generated/test helpers to reduce false positives.
- Resolve TS/lint issues:
  - Add BaseEventTypeMap import and drop unused Zod\* types in
    resolveHttpFromFunctionConfig; tidy imports in OpenAPI & Serverless builders.
  - Align custom-fields-and-values wrappers to generated arities and make
    unused opts explicit with `void opts;`.
- Wrappers: make unused requestFn options explicit with `void opts;` and
  align to generated client arities (remove unsupported options args).
- stagesFactory: keep GlobalParams/StageParams nomenclature as value types;
  schemas remain separate inputs for validation. No behavior change; fixes
  key-of-ZodObject typing drift.
- Implement explicit `orvalMutator` forwarder function in local wrapper to satisfy Orval export check.

## Completed (recent)

- Fix TS parse/build failure in makeWrapHandler by moving destructuring off the comment line.
- Orval mutator path: point override.mutator.path to '../src/orval.mutator.ts'
  (relative to the generated workspace) so Orval resolves the local wrapper and
  stops searching under 'generated/src'. This unblocks client regeneration.
- Orval mutator fix: add local wrapper (src/orval.mutator.ts) re-exporting the
  published mutator subpath and point override.mutator.path to it. Resolves
  ENOENT during generation on Windows and fulfills the “use published subpath”
  requirement.
- Remove non-standard http event property “x-context” from generated
  serverless functions to eliminate packaging warnings.
- Clean up monorepo remnants:
  - Drop "packages/\*" from npm workspaces.
  - Remove "packages/cached-axios/\*" path alias from root tsconfig.
- ESLint hardening: add explicit return type casts in ActiveCampaign wrapped
  helpers to satisfy no-unsafe-return; tidy imports and minor lint issues.
- Fix typecheck by:
  - Providing default generic for Handler’s EventType.
  - Annotating parameters in makeWrapHandler’s middy wrapper.
  - Constraining generics in resolveHttpFromFunctionConfig and
    buildFunctionDefinitions.
  - Updating buildFunctionDefinitions to accept serverlessConfig and compute
    a correct handler path.
  - Casting the Step Function event to LambdaEvent in getContact handler.
  - Typing test middleware helper to return HttpResponse.
