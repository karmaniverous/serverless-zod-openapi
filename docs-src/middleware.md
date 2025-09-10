---
title: HTTP middleware
sidebar_label: Middleware
sidebar_position: 3
---

# HTTP middleware

SMOZ builds a robust Middy stack around HTTP handlers. Non‑HTTP flows bypassMiddy entirely.

## Defaults (in order)

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

## Customization surfaces

- App level (optional; in `App.create`):
  - `http.defaults`: base options (e.g., contentType, logger)
  - `http.profiles`: named profiles (options + extend/transform)
- Function level (optional; in `app.defineFunction`):
  - `http.profile`: choose one profile by name
  - `http.options`: shallow overrides
  - `http.extend`: append steps into phases
  - `http.transform`: insert/replace/remove steps by ID
  - `http.replace`: phased arrays or a single middleware (advanced)

## Invariants

- `head` first in `before`
- `serializer` last in `after`
- `shape` precedes `serializer`
- `error-handler` only in `onError`
- If event/response schemas are present, `zod-before` and `zod-after` must exist

## Examples

Choose a profile and override content type:

```ts
app.defineFunction({
  // ...
  http: {
    profile: 'publicJson',
    options: { contentType: 'application/vnd.my+json' },
  },
});
```

Insert a header after the response shaper:

```ts
import { insertAfter } from '@karmaniverous/smoz';
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

Replace (advanced):

```ts
app.defineFunction({
  // ...
  http: {
    replace: {
      stack: {
        before: [...],  // include 'head' and 'zod-before' when schemas are present
        after:  [...],  // ensure 'shape' before 'serializer'; include 'zod-after'
        onError: [...], // include 'error-handler' only here
      },
    },
  },
});
```
