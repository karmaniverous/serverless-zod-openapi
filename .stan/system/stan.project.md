# Global Requirements & Cross‑Cutting Concerns

> Source of truth for non-file-specific requirements. Keep business logic comments lean; record the intent here.

<!-- CLI REQUIREMENTS ADDED -->
## Contributor workflow: Directory/file changes

- When a structural reorganization (moves/renames/deletions) is needed,
  the assistant will provide a precise file-move plan (paths to move,
  rename, or delete) instead of emitting patches for those changes.
- You apply the moves in your IDE. After you confirm, the assistant will
  follow up with a focused patch to adjust imports/wiring only.

## 1) Logger shape

- Requirement: Anywhere a `logger` is accepted or passed, it MUST extend `ConsoleLogger` (i.e., be compatible with the standard `console` interface).- Implication: Defaults should use `console`. Function and middleware options that accept `logger` must type it as `ConsoleLogger`.- Enforcement: `makeWrapHandler` and HTTP middleware use `ConsoleLogger` and default to `console`.

## 2) OpenAPI specs (hand-crafted)

- Requirement: OpenAPI specs are hand‑crafted. Do not auto‑derive or make sections conditional based on Zod schemas.
- Placeholders: When a placeholder schema is needed, use `z.any()` and proceed; do not try to “teach” `zod-openapi` about conditional structures.

## 3) Testability of environment config

- Requirement: Files that depend on `@/src/config/*` must be mock‑friendly with Vitest.
- Pattern: Avoid top‑level ESM imports that get evaluated before `vi.mock()` can apply. Instead, lazily import at runtime inside functions (no dynamic type imports), so test mocks are honored.

## 4) @karmaniverous/cached-axios — project‑relevant summary and rules

This service package uses a small toolkit layered on Axios to standardize
request defaults, add declarative caching, and organize cache invalidation.
The library integrates cleanly with Orval‑generated clients via a mutator.
This section documents how we use it in this repo and the rules to follow.

- Key concepts used here:
  - Config input and typed builders (ConfigInputSchema, buildConfig)
    - Define a hierarchical cache “shape” and get typed helpers that produce
      stable cache IDs and Tags. See services/activecampaign/src/api/config.ts.
    - Example shape we use: contacts.detail and contacts.list.any.
      - cacheConfig.contacts.detail.id(contactId) → stable cache key
      - cacheConfig.contacts.detail.tag(contactId) → invalidation tag
      - cacheConfig.contacts.list.any.tag() → broad invalidation tag for lists
  - Query and Mutation wrappers (withQuery, withMutation) and bound helpers
    - withQuery(requestFn, id, tags, defaults?) caches a read by ID and
      associates tags for later invalidation.
    - withMutation(requestFn, tagsToInvalidate, defaults?) performs a write
      and invalidates the provided tags.
    - makeCacheHelpers(defaultsFactory) provides cache.query/mutation bound to
      our default AxiosRequestConfig (see acDefaults in src/http.ts).
  - Orval mutator
    - Orval can generate clients that call through a custom “mutator”. We use
      a local wrapper file that must export a function named `orvalMutator`.
      The mutator is referenced via override.mutator.path in
      services/activecampaign/orval.config.ts.

- Our patterns and where they live:
  - Default request config (base URL, headers, token):
    - services/activecampaign/src/http.ts exposes `acDefaults()` that derives
      baseURL and headers from env (AC_SERVER/AC_BASE_URL/AC_API_TOKEN, with
      compatibility env aliases). It also exports a bound `cache` via
      `makeCacheHelpers(acDefaults)`.
  - Cache config:
    - services/activecampaign/src/api/config.ts defines the cache “shape”
      (contacts.detail, contacts.list.any), validates it with
      ConfigInputSchema, and builds `cacheConfig` for typed id/tag helpers.
  - Wrapped reads/writes (ActiveCampaign):
    - services/activecampaign/src/wrapped/\*.ts use either `withQuery`/
      `withMutation` and/or the `cache` helpers to:
      1. validate inputs with Zod (generated `*.zod.ts`),
      2. call the Orval client,
      3. apply caching (ID + Tags) and invalidation consistently,
      4. return typed `AxiosResponse<T>` results.
    - Examples:
      - fetchContactCore uses withQuery with detail ID and tags for both
        detail and the “any list” bucket.
      - createContactRaw and syncContactRaw use withMutation and invalidate
        list buckets (and, when safe, targeted detail tags).
  - Domain APIs:
    - services/activecampaign/src/api/contacts/\*.ts compose wrapped client
      calls with domain mapping (Zod validation, materialize helpers,
      field‑maps, multiselect coercion, etc.) and return strongly typed
      domain objects (`Contact`, etc.).

- Orval mutator requirements (important for generation):
  - In `services/activecampaign/orval.config.ts`, we point
    `override.mutator.path` to `../src/orval.mutator.ts`. This keeps the
    mutator next to our source (not copied into the generated workspace) and
    avoids Windows path issues.
  - The local file `services/activecampaign/src/orval.mutator.ts` must export
    a named function `orvalMutator`. A direct `export { orvalMutator } from
'@karmaniverous/cached-axios/mutators/orval'` may not satisfy Orval’s
    export checker. If Orval reports “Your mutator file doesn't have the
    orvalMutator exported function”, implement an explicit forwarder: - Import the upstream function as a local name, then export a named
    function that forwards its arguments. This keeps behavior identical and
    satisfies Orval’s static check.
  - After fixing the export, re‑run `npm run generate` in the
    `services/activecampaign` workspace. The generated clients should import
    the local mutator and eliminate any stale “packages/cached-axios” paths.

- Env variables used by acDefaults:
  - AC_SERVER or ACTIVE_CAMPAIGN_SERVER (subdomain, e.g., youracct.api-us1.com)
  - AC_BASE_URL or ACTIVE_CAMPAIGN_BASE_URL (full URL; overrides server)
  - AC_API_TOKEN or ACTIVE_CAMPAIGN_API_TOKEN

- Linting and typing guidance in wrappers:
  - Always validate inputs with the corresponding `*.zod.ts` schema before
    issuing requests; this keeps runtime predictable and aligns with generated
    shapes.
  - Return type expectations:
    - Low‑level wrappers return `Promise<AxiosResponse<{...}>>`. When wrapped
      helpers or withQuery/withMutation produce a wider/unknown type, narrow
      with an explicit `as Promise<AxiosResponse<T>>` to satisfy
      `@typescript-eslint/no-unsafe-return` under strict settings.
    - Domain APIs should validate and return Zod‑shaped outputs (e.g., `Contact`
      or `Contact | undefined`) instead of raw API envelopes.

- When to choose cache.query/mutation vs withQuery/withMutation:
  - Use `cache.query`/`cache.mutation` when you want the defaults factory
    applied automatically and your request function accepts only an options
    object (typical Orval clients).
  - Use `withQuery`/`withMutation` when you need to thread `acDefaults`
    alongside additional call‑site options, or to keep the “unbound” form in
    a particular adapter.

These rules ensure consistent caching/invalidation, robust generation with
Orval, and predictable Axios defaults across all ActiveCampaign calls.

## 5.5) Toolkit naming & API clarity (v0, breaking)

- Interface-first public shapes. Prefer `interface` over `type` where practical; compose small interfaces for reuse.
  - Introduce:
    - EnvKeysNode<Schema>, EnvSchemaNode<Schema>,
    - GlobalEnvConfig<GlobalParamsSchema, StageParamsSchema>,
    - GlobalParamsNode<GlobalParamsSchema>, StageParamsNode<StageParamsSchema>,
    - DefineAppConfigInput/Output.
  - Provide defineAppConfig(globalParamsSchema, stageParamsSchema, { serverless, global, stage }) returning:
    - serverless (unchanged semantics),
    - stages/environment/buildFnEnv (from stagesFactory),
    - envConfig (schemas + envKeys) for wrapper.

- No glue wrapper. Rename and simplify:
  - makeWrapHandler → wrapHandler(envConfig, functionConfig, business).
  - envConfig carries schemas and envKeys; wrapper composes env schema and parses process.env internally.

- Function/builder naming:
  - makeFunctionConfig → defineFunctionConfig (same semantics).
  - buildFunctionDefinitions → buildServerlessFunctions (same semantics).
  - buildPathItemObject → buildOpenApiPath (same semantics).

- DX: envKeys are typed as `readonly (keyof z.infer<Schema>)[]` so IntelliSense suggests only valid keys and invalid literals squiggle individually.
- Runtime guard:
  - When building config or invoking the wrapper, assert every envKeys entry is present in the corresponding Zod schema shape (“no unspecified \*EnvKeys”).

## 5) HTTP middleware stack policy (durable; do not remove)

We maintain a rich HTTP middleware pipeline that MUST remain intact for allHTTP handlers. This stack is HTTP‑only; non‑HTTP (“internal”) paths bypass
Middy entirely in `makeWrapHandler`. Do not add an “internal” toggle here.

Required middlewares (order matters):

1. shortCircuitHead — early HEAD short‑circuit.
2. httpHeaderNormalizer({ canonical: true }) — normalize headers.
3. httpEventNormalizer() — normalize APIGW v1 events.
4. httpContentNegotiation({ availableMediaTypes: [contentType], parse\* false })
   — populate preferred media types.
5. httpJsonBodyParser({ disableContentTypeError: true }) — only for methods
   with a body; no 415 when Content‑Type is missing/odd.
6. httpZodValidator(eventSchema, responseSchema, logger) — validate request
   pre‑handler and response post‑handler. HEAD is skipped via a dedicated
   “head finalize” step that pre‑sets a 200 {} response before Zod‑after runs.
7. Error exposure shim — mark all errors `expose=true`; map validation‑shaped
   errors to 400 unless already carrying a statusCode.
8. httpErrorHandler({ logger }) — respect `expose`/`statusCode` and produce
   JSON error bodies.
9. httpCors({ credentials: true, getOrigin: o => o }) — preserve origin.
10. Preferred media types default across phases — ensure tests and error paths
    don’t 415 when Accept is absent.
11. Response shaper — normalize envelope (statusCode/headers/body) and enforce
    Content‑Type; coerce body to string for serializer friendliness.
12. httpResponseSerializer — JSON and vendor +json types (ld+json, vnd.api+json).

Tests and acceptance:

- HEAD returns 200 {} with Content‑Type (skips response validation cleanly).
- Shaped and string bodies pass through; non‑shaped payloads are shaped.
- Validation errors surface as 400; other errors are exposed as set or defaulted.
- Content negotiation and serializer behavior preserves JSON (+json) types.

Process rule:

- Do not simplify or drop this stack. Any proposed change in middlewares or
  ordering MUST be discussed, documented here, and covered by tests.

## 6) Repository intent and toolkit publishing

- Intent: lib/ is the publishable toolkit; src/ is a test/demo stack used to
  exercise the toolkit.
- The toolkit’s scope:
  - Handler wrapping, middleware composition, Zod validation, error mapping.
  - Serverless/OpenAPI helpers (buildFunctionDefinitions, path builders,
    OpenAPI path item builders).
  - Config typing utilities and glue (no project‑specific values).
- The test stack (src/) remains a consumer of lib/, proving the surfaces.

## 7) Config model simplification (direction)

Goal: simplify authoring while keeping strong types.

- Per‑function config: a single object in each `config.ts` that inlines
  `eventSchema` and `responseSchema`; consumers read them from
  `functionConfig.eventSchema`/`responseSchema` (no external pairing needed).
- Stack config: collapse to just two things:
  1. EventTypeMap (project‑local token → base event type mapping).
  2. A comprehensive AppConfig (single object) with zod schema and types for:
     - serverless defaults (handler defaults, http context mapping),
     - environment exposure (global/stage/fn‑level),
     - any project‑wide policies needed by builders.
- Helpers currently under src/config that are generic move into lib/.

Consumption model:

- Apps import the library, define their EventTypeMap and AppConfig (via zod),
  and then author per‑function configs. Library builders generate serverless
  and OpenAPI artifacts directly from those inputs.

Migration notes:

- `makeFunctionConfig` remains the typed entry for per‑function configs and
  binds the local EventTypeMap.
- `buildFunctionDefinitions` and OpenAPI builders accept the single function
  config and the single AppConfig; they do not depend on scattered modules.
- Internal mode (non‑HTTP) remains outside middleware; enforced by wrapper.

This direction is durable. Adjustments to the config shapes and migration plan
should be recorded here and reflected in the dev plan.

## 8) App singleton & function registry (v0, breaking)

Purpose

- Establish a single source of truth for function definitions, env typing, and
  event-type unions (including app-local extensions like “step”). Eliminate
  intermediate glue (e.g., exported envConfig) and enable clean separation of
  concerns across modules (function definition, handler, OpenAPI, Serverless).

Architecture overview

- App singleton:
  - The application is represented by a single instance (the “app”) created
    from schemas and configuration:
    - global params schema + envKeys,
    - stage params schema + envKeys,
    - serverless defaults (defaultHandlerFileName/export, httpContextEventMap),
    - eventTypeMapSchema (must extend the base event-type schema).
  - The instance captures:
    - env metadata (schemas + envKeys),
    - stage artifacts (stages, environment, buildFnEnv) via stagesFactory,
    - event-type map schema (for compile-time EventType inference).
    - an in-memory function registry keyed by a “slug”.

- Event-type schema (schema-first typing):
  - Provide baseEventTypeMapSchema (rest, http, sqs) using z.custom<…> to
    carry shapes at compile time. Example:
    - rest: APIGatewayProxyEvent,
    - http: APIGatewayProxyEventV2,
    - sqs: SQSEvent.
  - The app must supply eventTypeMapSchema that “extends” the base (compile-time
    bound + runtime guard). This preserves extension (e.g., “step”) without
    polluting the base map type. EventType inference flows from the app schema.
  - Compile-time guarantee: eventTypeMapSchema’s output type must include the
    base schema keys with compatible types.
  - Runtime guard: assert that base keys exist in eventTypeMapSchema.shape.

Slug policy

- Define:
  - type SlugGenerator = (rootPath: string, functionPath: string) => string
  - A rational defaultSlugGenerator(root, fileDir) that derives a stable slug
    from file layout (POSIX-normalized, lowercased, safe characters only).
  - The app configuration accepts an optional slugGenerator?: SlugGenerator.
    If absent, defaultSlugGenerator is used.

- Slug derivation (default) :
  - functionPath = POSIX(relative(endpointsRootAbs, dirname(callerModuleUrl)))
  - slug = sanitize(functionPath) where sanitize:
    - lowercases,
    - replaces disallowed characters with “-”,
    - collapses duplicate separators/dashes.
  - Slugs are reused for:
    - Serverless function identifiers (functions[slug]),
    - OpenAPI operationIds (slug + method and context suffixes when applicable).

- Duplicate detection:
  - Registration MUST throw if a slug already exists in the registry.
  - Error message MUST include both registering module paths and instruct to
    disambiguate by providing an explicit options.slug or modifying file layout.

Function registration (single options argument; no intermediate env config)

- Functions are registered on the app singleton with a single options object.
  - options include:
    - callerModuleUrl: string (import.meta.url),
    - endpointsRootAbs: string (ENDPOINTS_ROOT),
    - slug?: string (optional; if omitted, derived using slugGenerator),
    - functionName: string,
    - eventType: keyof z.infer<typeof app.eventTypeMapSchema> (e.g., 'rest',
      'http', 'sqs', plus app-local tokens like 'step'),
    - eventSchema?: ZodType,
    - responseSchema?: ZodType,
    - fnEnvKeys?: readonly (keyof GlobalParams | keyof StageParams)[],
    - HTTP-only: method?: MethodKey, basePath?: string, httpContexts?: readonly HttpContext[], contentType?: string,
    - Non-HTTP: events?: unknown (AWS event objects as needed).
  - The app brands the stored FunctionConfig with env via a private Symbol
    (no exported envConfig), preserving fnEnvKeys typing and testability.

Returned per-function API (no slug reuse required by consumers)

- defineFunction(options) returns a typed object for that function:
  - handler(business): exports a runtime handler by wrapping the stored config
    (env read from the brand). No extra glue required.
  - openapi(baseOperation): attaches per-function OpenAPI base operation.
  - serverless(extras): attaches non-HTTP serverless events for this function.
  - None of these require consumers to know or pass the slug explicitly.

Separation of concerns (modules per function)

- Hygiene goal: large concerns may be split into distinct modules; they must
  remain small and focused, and only import what they need.
  - lambda.ts: the source of truth, calls app.defineFunction({...}) and exports
    the per-function API object returned by registration (e.g., export const fn).
  - handler.ts: import { fn } from './lambda' and export const handler = fn.handler(business).
  - openapi.ts: import { fn } from './lambda' and call fn.openapi(baseOperation).
  - serverless.ts (non-HTTP only): import { fn } from './lambda' and call
    fn.serverless(extras). HTTP endpoints typically don’t need a separate file
    if method/basePath/httpContexts suffice.

Aggregation (explicit loaders; no hidden imports)

- To generate global artifacts without per-function imports, use small loaders:
  - register.functions.ts: imports all lambda.ts (ensures every function is
    registered before builds).
  - register.openapi.ts: imports all openapi.ts (ensures per-function OpenAPI
    base operations are attached).
  - register.serverless.ts: imports all non-HTTP serverless.ts (ensures extras
    are attached).
  - These are imported by:
    - serverless.ts: import app, register.functions, register.serverless, then
      call app.buildAllServerlessFunctions() to produce AWS['functions'].
    - app/config/openapi.ts: import app, register.functions, register.openapi,
      then call app.buildAllOpenApiPaths() and compose the document.
  - Optionally, loader files can be generated by a script from a glob scan.

OpenAPI and Serverless generation

- OpenAPI:
  - Per-function baseOperation is attached via fn.openapi(baseOperation).
  - OperationId defaults:
    - HTTP with contexts: `${slug}_${method}_${context}`,
    - HTTP without contexts: `${slug}_${method}`,
    - Non-HTTP: slug (or slug + “\_internal” if configured).
  - app.buildAllOpenApiPaths() merges per-function paths.

- Serverless:
  - app.buildAllServerlessFunctions():
    - For HTTP: derive handler, method/path via resolveHttpFromFunctionConfig
      using stored { callerModuleUrl, endpointsRootAbs } and per-function HTTP
      fields; functions[slug] is created.
    - For non-HTTP: include per-function events attached via fn.serverless().
    - Provider-level environment is taken from app.environment. Per-function
      buildFnEnv merges fnEnvKeys excluding globally exposed keys.

Breaking changes (no shims; v0)

- Remove exported envConfig and any “loadEnvConfig” helpers.
- Remove free-function defineFunctionConfig/defineFunctionConfigFromApp; the
  only authoring surface is app.defineFunction(options), which returns a typed
  per-function API object ({ handler, openapi, serverless }).
- Remove free-function builders buildServerlessFunctions/buildOpenApiPath from
  the public API; these are now app instance methods used internally by the
  registry aggregations (or exposed as app.buildAllServerlessFunctions/
  app.buildAllOpenApiPaths only).

Testing and DX

- Tests can import the app singleton or a test factory; a reset API can be
  exposed under test-only builds to clear the registry, or a createTestApp
  helper can be provided. Handlers are wrapped through fn.handler(business),
  preserving testability and avoiding config duplication.

## 9) CLI requirements (smoz)

Purpose
- Provide a companion CLI to bootstrap and maintain SMOZ apps following the schema‑first DX and strong conventions already established in this repository.

Conventions (directory layout)
- Author code lives under:
  - app/config/app.config.ts
  - app/functions/<eventType>/... (e.g., app/functions/rest/openapi/get)
- Generated artifacts live under:
  - app/generated/
    - register.functions.ts  (side‑effect imports of all lambda.ts)
    - register.openapi.ts    (side‑effect imports of all openapi.ts)
    - register.serverless.ts (side‑effect imports of per‑function serverless.ts; optional)
    - openapi.json           (OpenAPI document)
- Rationale:
  - “Event‑type as directory” is preserved strictly for author code under app/functions.
  - All generated files are co‑located in app/generated to keep the tree hygienic and predictable.

Configuration boundaries
- smoz.config.json|yml (project root):
  - Minimal by design; v1 keys:
    - appRoot: "app" (default)
  - No “roots” map; no httpEventTypeTokens here.
- app/config/app.config.ts:
  - Authoritative source for httpEventTypeTokens (e.g., ['rest','http']).
  - Apps may widen/modify this set at any time; CLI must respect it.

Commands
- smoz -v | --version
  - Prints CLI version, Node version, detected package manager, repo root, and whether smoz.config.* and app/config/app.config.ts exist.
- smoz init [--template minimal|full] [--pm npm|pnpm|yarn] [--yes]
  - Scaffolds a new app:
    - Creates app/config/app.config.ts importing from 'smoz' with default httpEventTypeTokens ['rest','http'].
    - Creates example endpoints:
      - app/functions/rest/hello/get/{lambda.ts, handler.ts}
      - app/functions/rest/openapi/get/{lambda.ts, handler.ts, openapi.ts}
    - Writes serverless.ts (imports app/generated/register.functions and register.serverless).
    - Writes app/config/openapi.ts (imports app/generated/register.openapi and writes app/generated/openapi.json).
    - Seeds app/generated/register.*.ts as empty modules so typecheck passes before first “register”.
    - Installs dependencies: runtime (zod, @middy/core), infra (serverless v4 + curated plugins), and dev stack in the “full” template (typescript, tsx, eslint + typescript‑eslint, prettier, vitest, typedoc, zod‑openapi).
- smoz register
  - Scans app/functions/** for:
    - lambda.ts → generates app/generated/register.functions.ts
    - openapi.ts → generates app/generated/register.openapi.ts
    - serverless.ts → generates app/generated/register.serverless.ts (only if any exist)
  - Idempotent: rewrites only on content change; formats with Prettier.
  - Does not require loading app.config.ts.
- smoz add <eventType>/<segments>/<method>
  - Example:
    - smoz add rest/foo/post
    - smoz add step/activecampaign/contacts/getContact
  - Requires app/config/app.config.ts; reads httpEventTypeTokens from it.
  - Generates:
    - lambda.ts + handler.ts for all event types.
    - openapi.ts only when eventType ∈ httpEventTypeTokens.
  - Paths must follow the event‑type‑as‑directory convention under app/functions.

Safety, idempotence, and failure modes
- Generated folder is fixed (app/generated). No override knob.
- smoz add fails with clear guidance if app/config/app.config.ts is missing (run smoz init first) or cannot be evaluated (install tsx).
- smoz register exits successfully even if no matching files are found; it still ensures empty register files exist (to preserve typecheck stability).
- All file writes are atomic and formatted; no partial or malformed outputs.

Runtime and packaging decisions
- Library: dual outputs (ESM + CJS) remain.
- CLI bin: compiled CJS entry for maximum compatibility.
  - When the CLI needs to evaluate TypeScript (e.g., reading app.config.ts for httpEventTypeTokens), it will spawn the project’s local tsx when available; otherwise, it will print actionable guidance and fail (for smoz add).

Templates (packaged)
- templates/project: shared boilerplate (tsconfig, eslint/ts‑eslint, prettier, vitest, typedoc, npm scripts).
- templates/minimal: hello + openapi endpoints; “just enough” DX.
- templates/full: curated DX mirroring this repo (can follow after minimal).
- The package includes templates/** in “files”; CLI copies from packaged assets (resolved via import.meta.url).

VCS guidance
- Commit app/generated/register.*.ts so typecheck is stable without running the CLI.
- app/generated/openapi.json is ignored by default; teams may choose to track it explicitly.

Future extensions (non‑blocking)
- smoz doctor: verify environment and project shape.
- smoz add --http/--non-http: override token inference if app.config.ts can’t be evaluated (out of scope for v1 to keep semantics clean).
- smoz register --watch: optional live mode; defer until after v1.

## 10) Repo hygiene for event types and tokens (durable rules)

- Single source of truth for event type mapping is the Zod schema:
  - core/baseEventTypeMapSchema exports:
    - baseEventTypeMapSchema (Zod object)
    - type BaseEventTypeMap = z.infer<typeof baseEventTypeMapSchema>
  - The schema includes widely‑used, generic AWS events (e.g., rest, http, alb, sqs, sns, s3, dynamodb, kinesis, eventbridge, cloudwatch‑logs, ses, cloudfront, firehose, iot‑button, cognito‑userpool, codepipeline). Apps may extend with project‑specific tokens.
- defaultHttpEventTypeTokens lives in core/httpTokens.ts. No parallel definitions elsewhere.
- Remove redundant/obsolete artifacts:
  - src/types/BaseEventTypeMap.ts (replaced by the schema’s type alias)
  - src/types/HttpEventTokens.ts (replaced by core/httpTokens.ts)
  - src/types/ShapedEvent.ts if unreferenced (business handlers should rely on the generic Handler.ShapedEvent from types/Handler.ts)
- Tests must use the same schema‑first surfaces as production (no legacy helpers). Any test relying on removed artifacts must be migrated to current API prior to deletion.

Acceptance criteria for hygiene
- Grep reveals no imports from src/types/BaseEventTypeMap or src/types/HttpEventTokens.
- The base event schema is consolidated into a single module; the type alias is re‑exported from it and consumed across the codebase.
- All tests compile and pass using the schema‑first DX (no local test‑only shapes).
- Only intrinsics flagged for future use (e.g., serverless/intrinsic.ts) remain as deliberately retained forward‑compatibility helpers.