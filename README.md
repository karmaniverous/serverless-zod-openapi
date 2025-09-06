<div align="center">

# SMOZ

[Serverless](https://www.serverless.com/) · [Middy](https://middy.js.org/) · [OpenAPI 3.1](https://spec.openapis.org/oas/latest.html) · [Zod](https://zod.dev/)

[![npm version](https://img.shields.io/npm/v/@karmaniverous/smoz.svg)](https://www.npmjs.com/package/@karmaniverous/smoz)
![Node Current](https://img.shields.io/node/v/@karmaniverous/smoz) <!-- TYPEDOC_EXCLUDE -->
[![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/smoz)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](https://github.com/karmaniverous/smoz/tree/main/CHANGELOG.md)<!-- /TYPEDOC_EXCLUDE -->
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://github.com/karmaniverous/smoz/tree/main/LICENSE.md)

</div>

SMOZ is a tiny, pragmatic toolkit that helps you:

- Author AWS Lambda handlers with [Middy] middleware and first‑class Zod validation
- Define your application once and generate:
  - Serverless functions (handler strings, HTTP events, env mapping)
  - OpenAPI 3.1 paths (hand‑crafted, no magic)
- Keep prod code small and testable (no framework lock‑in)

It’s batteries‑included for an everyday DX: schema‑first types, env hygiene, HTTP shaping, error mapping, CORS, JSON negotiation, HEAD short‑circuiting, and a clean way to add non‑HTTP functions (SQS/Steps/etc) without touching the HTTP stack.

Why this stack?

- Serverless makes deployment boring
- Middy is the right level of middleware
- OpenAPI is your contract (hand‑crafted here—no leaky auto‑gen)
- Zod is a fast, composable runtime validator that doubles as types

## Highlights

- Schema‑first App class:
  - define global/stage params and env keys
  - extend base event‑type map (rest, http, sqs) with your own (e.g., step)
  - register functions once, then aggregate Serverless + OpenAPI
- HTTP runtime wrapper:
  - header/event normalization, JSON body parsing, content negotiation
  - Zod validation (event and response)
  - error exposure + validation→400 mapping
  - CORS and response serializer with JSON (+json vendor types)
  - HEAD short‑circuit to 200 {}
- Non‑HTTP stays lean:
  - wrapper bypasses Middy entirely for internal events
  - same options surface, no hidden toggles

## Install

```bash
npm i smoz zod zod-openapi @middy/core \
  @middy/http-header-normalizer \
  @middy/http-event-normalizer \
  @middy/http-json-body-parser \
  @middy/http-content-negotiation \
  @middy/http-error-handler \
  @middy/http-cors \
  @middy/http-response-serializer
```

Dev tooling (recommended):

```bash
npm i -D typescript typescript-eslint eslint prettier typedoc
```

## Quick start

1. Create your application config (schema‑first)

app/config/app.config.ts

```ts
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { App, baseEventTypeMapSchema, toPosixPath } from '@karmaniverous/smoz';

const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);

export const app = App.create({
  appRootAbs: APP_ROOT_ABS,  globalParamsSchema: z.object({
    REGION: z.string(),
    SERVICE_NAME: z.string(),
  }),
  stageParamsSchema: z.object({
    STAGE: z.string(),
  }),
  eventTypeMapSchema: baseEventTypeMapSchema, // extend with custom tokens if needed
  serverless: {
    httpContextEventMap: { my: {}, private: { private: true }, public: {} },
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  },
  global: {
    params: { REGION: 'us-east-1', SERVICE_NAME: 'my-svc' },
    envKeys: ['REGION', 'SERVICE_NAME'],
  },
  stage: { params: { dev: { STAGE: 'dev' } }, envKeys: ['STAGE'] },
});
export const { stages, environment, buildFnEnv } = app;
```

2. Define an HTTP endpoint

app/functions/rest/hello/get/lambda.ts

```ts
import { z } from 'zod';
import { app } from '@/app/config/app.config';
import { ENDPOINTS_ROOT } from '@/app/endpoints/_root';

export const responseSchema = z.object({ ok: z.boolean() });

export const fn = app.defineFunction({
  functionName: 'hello_get',
  eventType: 'rest', // 'http' works too; both are “HTTP tokens” at runtime
  httpContexts: ['public'],
  method: 'get',
  basePath: 'hello',
  contentType: 'application/json',
  // eventSchema: z.object({ ... }) // optional request validation
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: ENDPOINTS_ROOT, // e.g., absolute "functions/rest" root
});
```

app/functions/rest/hello/get/handler.ts

```ts
import { fn, responseSchema } from './lambda';
type Response = import('zod').infer<typeof responseSchema>;
export const handler = fn.handler(
  async () => ({ ok: true }) satisfies Response,
);
```

3. Generate OpenAPI (hand‑crafted entries)

```ts
// app/config/openapi.ts
import '@/app/generated/register.openapi'; // load all per-function OpenAPI registrations
import fs from 'fs-extra';
import path from 'path';
import { packageDirectorySync } from 'pkg-dir';
import { createDocument } from 'zod-openapi';
import { app } from '@/app/config/app.config';

const paths = app.buildAllOpenApiPaths();
const doc = createDocument({
  openapi: '3.1.0',
  servers: [{ description: 'Dev', url: 'http://localhost' }],
  info: { title: 'smoz', version: process.env.npm_package_version ?? '' },
  paths,
});
fs.writeFileSync(
  path.join(packageDirectorySync()!, 'app/generated/openapi.json'),
  JSON.stringify(doc, null, 2),
);
```

Run:

```bash
npm run register   # generates app/generated/register.*.ts
npm run openapi
```

4. Package / Deploy with Serverless

serverless.ts (snippet)

```ts
import '@/app/generated/register.functions';
import '@/app/generated/register.serverless';
import type { AWS } from '@serverless/typescript';
import { app, environment, stages } from '@/app/config/app.config';

const config: AWS = {
  service: '${param:SERVICE_NAME}',
  frameworkVersion: '4',
  stages,
  provider: {
    name: 'aws',
    region: '${param:REGION}',
    runtime: 'nodejs22.x',
    environment,
    stage: '${opt:stage, "dev"}',
  },
  functions: app.buildAllServerlessFunctions() as NonNullable<AWS['functions']>,
};
export default config;
```

```bash
npm run register   # ensure registers reflect current app/functions/**
npm run package
```

## What you get (HTTP stack)

SMOZ’s HTTP wrapper composes a robust Middy pipeline:

1. HEAD short‑circuit (200 {} immediately)
2. Header normalization (canonical case)
3. APIGW v1 event normalization
4. Content negotiation (JSON, vendor +json)
5. Safe JSON body parsing (no 415 surprises)
6. Zod validation (event before handler, response after handler)
7. Error exposure + validation→400 mapping
8. http‑error‑handler with your logger
9. CORS (credentials on; preserves computed origin)
10. Preferred media types defaults across phases
11. Response shaper (statusCode/headers/body) + content‑type enforcement
12. Response serializer (JSON and vendor +json)

Non‑HTTP events bypass Middy entirely, so your internal handlers stay tiny and fast.

## HTTP middleware customization

SMOZ exposes a modular customization surface for the HTTP middleware stack while
keeping robust defaults. You can set app‑wide defaults and profiles, then refine
per function with simple options, phased extensions, targeted transforms, or a
full replace (phased arrays).

Surfaces:

- App level (optional; in App.create):
  - http.defaults: HttpStackOptions (e.g., contentType, logger)
  - http.profiles: Record<string, HttpProfile> (options + extend/transform)
- Function level (optional; in app.defineFunction):
  - http profile: pick one profile by name
  - http options: Partial<HttpStackOptions> (shallow overrides)
  - extend: append steps into phases (before/after/onError)
  - transform: pure function that can insert/replace/remove steps by ID
  - replace: supply phased arrays or a single middleware (see footgun note)

Merge order:

1. defaults (app) → 2) profile (app) → 3) options (function) → 4) extend
   (defaults → profile → function) → 5) transform (defaults → profile →
   function) → 6) replace (function; final).

Step IDs and invariants:

- Stable step IDs (in order around the core):
  - before: head, header-normalizer, event-normalizer, content-negotiation,
    json-body-parser, zod-before
  - after: head-finalize, zod-after, error-expose, cors, preferred-media, shape, serializer
  - onError: error-expose, error-handler
- Invariants enforced:
  - head must be first in before
  - serializer must be last in after
  - shape must precede serializer in after
  - error-handler may appear only in onError
- Zod enforcement:
  - If eventSchema or responseSchema is provided, the final stack must include
    zod-before (before) and zod-after (after). You may supply custom validators,
    but they must be tagged with these IDs.

Examples:

- Choose a profile and override content type:
  ```ts
  app.defineFunction({
    // ...
    http: {
      profile: 'publicJson',
      options: { contentType: 'application/vnd.my+json' },
    },
  });
  ```
- Insert a header after the response shaper:
  ```ts
  import { insertAfter } from 'smoz';
  const mw = {
    after: (req: any) => {
      req.response.headers['X-My'] = 'yes';
    },
  };
  app.defineFunction({
    // ...
    http: {
      transform: ({ before, after, onError }) => ({
        before,
        after: insertAfter(after, 'shape', mw as any),
        onError,
      }),
    },
  });
  ```
- Replace (advanced):
  - Provide phased arrays { before, after, onError } tagged to satisfy invariants
    and zod enforcement if schemas are present. Avoid a single middleware
    replacement unless no schemas are used, as Zod presence cannot be validated.

## Typedoc

Public API is documented with TSDoc and published with [TypeDoc]. Once generated:

- Docs hosting: https://docs.karmanivero.us/smoz
- Generate locally: `npm run docs`

## Scripts

- `npm run register` — scan app/functions/\*\* and (re)generate:
  - app/generated/register.functions.ts
  - app/generated/register.openapi.ts
  - app/generated/register.serverless.ts
- `npm run build` — produce ESM/CJS and a DTS bundle
- `npm run test` — run the unit tests
- `npm run openapi` — build the OpenAPI document
- `npm run package` — Serverless package (no deploy)
- `npm run deploy` — Serverless deploy
- `npm run docs` — build typedoc (to ./docs)
- `npm run knip` — static usage analysis for dead code

## FAQ

### Registers and httpEventTypeTokens

Use the CLI to maintain side‑effect registers under app/generated/register.\*.ts.
These are imported by serverless.ts and app/config/openapi.ts to aggregate
function and OpenAPI metadata.

httpEventTypeTokens are configured only in your app/config/app.config.ts.

### Why “hand‑crafted” OpenAPI?

OpenAPI is a contract with consumers; we don’t want it to drift unpredictably from runtime schemas. SMOZ helps you compose and attach path items but does not auto‑derive from Zod. Use Zod for runtime validation; use OpenAPI to describe the surface you publish.

### Zod v5?

SMOZ targets Zod v4 today. Zod v5 introduces a smaller surface with some breaking changes; once it stabilizes across the ecosystem (zod‑openapi, middy examples), we’ll publish guidance for upgrading your app config and schemas.

### Can I add my own event types?

Yes. Extend the base event type map schema in `App.create({ eventTypeMapSchema: baseEventTypeMapSchema.extend({ /* e.g., step */ }) })`. Use your custom token in `defineFunction({ eventType: 'step', ... })` — the wrapper will treat it as non‑HTTP unless you widen the HTTP event tokens at app construction time.

## License

BSD‑3‑Clause © Jason Williscroft

---

[Middy]: https://middy.js.org/
[TypeDoc]: https://typedoc.org/
