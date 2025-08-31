# Development Plan
When updated: 2025-08-30T00:00:00Z

## Next up
- Regenerate ActiveCampaign client with Orval to propagate the new mutator
  path (@karmaniverous/cached-axios/mutators/orval). Verify no generated
  files retain the old relative import.
- Consider removing legacy references to packages/cached-axios from the
  monorepo (paths/workspaces) if no longer needed.
- Follow up on ESLint “no-unsafe-*” items in wrapped ActiveCampaign helpers
  (may require tightening return types from cached-axios helpers).

## Completed (recent)
- Fix typecheck by:
  - Providing default generic for Handler’s EventType.
  - Annotating parameters in makeWrapHandler’s middy wrapper.
  - Constraining generics in resolveHttpFromFunctionConfig and
    buildFunctionDefinitions.
  - Updating buildFunctionDefinitions to accept serverlessConfig and compute
    a correct handler path.
  - Casting the Step Function event to LambdaEvent in getContact handler.
  - Updating Orval mutator path to new exported subpath.
  - Removing TS project references to a non-existent local packages/cached-axios.
  - Typing test middleware helper to return HttpResponse.
