# Development Plan

When updated: 2025-08-31T00:35:00Z

## Next up

- Run: npm run generate in services/activecampaign and confirm generated
  clients import the local wrapper (src/orval.mutator.ts) and build cleanly.
- Re-run: typecheck, lint, test; fix any residual issues from generated code.
- Review Knip output again and refine configuration (entry/project) to quiet
  false positives now that generation succeeds.
- If any ESLint “no-unsafe-\*” remain in services/activecampaign wrappers,
  narrow return types or switch to cache.query/cache.mutation helpers where
  appropriate; tidy import order.
- Orval mutator export check: if Orval reports the mutator function is missing,
  change services/activecampaign/src/orval.mutator.ts to export a named
  function `orvalMutator` that forwards to the upstream export, then re-run generate.

## Completed (recent)

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
