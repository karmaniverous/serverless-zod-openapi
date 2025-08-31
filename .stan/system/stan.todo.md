# Development Plan

When updated: 2025-08-31T00:00:00Z

## Next up

- Run: npm run generate in services/activecampaign and confirm generated
  clients import the local wrapper (src/orval.mutator.ts) and build cleanly.
- Re-run: typecheck, lint, test; fix any residual issues from generated code.
- Review Knip output again and refine configuration (entry/project) to quiet
  false positives now that generation succeeds.

## Completed (recent)

- Orval mutator fix: add local wrapper (src/orval.mutator.ts) re-exporting the
  published mutator subpath and point override.mutator.path to it. Resolves
  ENOENT during generation on Windows and fulfills the “use published subpath”
  requirement.
- Remove non-standard http event property “x-context” from generated
  serverless functions to eliminate packaging warnings.
- Clean up monorepo remnants:
  - Drop "packages/*" from npm workspaces.
  - Remove "packages/cached-axios/*" path alias from root tsconfig.
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