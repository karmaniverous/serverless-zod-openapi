# Global Requirements & Cross‑Cutting Concerns

> Source of truth for non-file-specific requirements. Keep business logic comments lean; record the intent here.

## 1) Logger shape

- **Requirement:** Anywhere a `logger` is accepted or passed, it **MUST** extend `ConsoleLogger` (i.e., be compatible with the standard `console` interface).
- **Implication:** Defaults should use `console`. Function and middleware options that accept `logger` must type it as `ConsoleLogger`.
- **Enforcement:** `makeWrapHandler` and HTTP middleware use `ConsoleLogger` and default to `console`.

## 2) OpenAPI specs (hand-crafted)

- **Requirement:** OpenAPI specs are **hand‑crafted**. Do **not** auto‑derive or make sections conditional based on Zod schemas.
- **Placeholders:** When a placeholder schema is needed, use `z.any()` and proceed; do **not** try to “teach” `zod-openapi` about conditional structures.

## 3) Testability of environment config

- **Requirement:** Files that depend on `@@/src/config/*` must be **mock‑friendly** with Vitest.
- **Pattern:** Avoid top‑level ESM imports that get evaluated before `vi.mock()` can apply. Instead, lazily import at runtime inside functions (no dynamic _type_ imports), so test mocks are honored.

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
    - services/activecampaign/src/wrapped/*.ts use either `withQuery`/
      `withMutation` and/or the `cache` helpers to:
      1) validate inputs with Zod (generated `*.zod.ts`),
      2) call the Orval client,
      3) apply caching (ID + Tags) and invalidation consistently,
      4) return typed `AxiosResponse<T>` results.
    - Examples:
      - fetchContactCore uses withQuery with detail ID and tags for both
        detail and the “any list” bucket.
      - createContactRaw and syncContactRaw use withMutation and invalidate
        list buckets (and, when safe, targeted detail tags).
  - Domain APIs:
    - services/activecampaign/src/api/contacts/*.ts compose wrapped client
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
    orvalMutator exported function”, implement an explicit forwarder:
    - Import the upstream function as a local name, then export a named
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