# Global Requirements & Cross‑Cutting Concerns

> Source of truth for non-file-specific requirements. Keep business logic comments lean; record the intent here.

## 1) Logger shape

- Requirement: Anywhere a `logger` is accepted or passed, it MUST extend `ConsoleLogger` (i.e., be compatible with the standard `console` interface).
- Implication: Defaults should use `console`. Function and middleware options that accept `logger` must type it as `ConsoleLogger`.
- Enforcement: `makeWrapHandler` and HTTP middleware use `ConsoleLogger` and default to `console`.

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

## 5) HTTP middleware stack policy (durable; do not remove)

We maintain a rich HTTP middleware pipeline that MUST remain intact for all
HTTP handlers. This stack is HTTP‑only; non‑HTTP (“internal”) paths bypass
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
