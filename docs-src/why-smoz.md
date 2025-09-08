---
title: Why smoz?
sidebar_label: Why smoz?
sidebar_position: 2
---

# Why smoz?

SMOZ is a tiny, pragmatic toolkit that favors explicit design over magic:

- Small surface area
  - Author Lambda handlers with [Middy] and first‑class [Zod] validation.
  - Define your app once and generate:
    - Serverless functions (handler strings, HTTP events, env mapping)
    - OpenAPI 3.1 paths (hand‑crafted)
- Keep prod code small and testable (no framework lock‑in).

## Philosophy

- Contract‑first: OpenAPI is authored, not reverse‑generated.
- Schema‑first: Zod validates inputs/outputs; types flow from schemas.
- Explicit wiring: a tiny registry collects per‑endpoint modules and emits
  Serverless + OpenAPI artifacts.
- HTTP/non‑HTTP split: HTTP gets a robust, customizable middleware stack;
  non‑HTTP paths stay lean (no overhead).

## Compared to alternatives

- Full frameworks (SST/NestJS/tsoa)
  - Pros: batteries‑included; stronger opinions.
  - Cons: larger surface, more indirection, harder to extract testable core.
  - SMOZ: keep code close to the platform; add only thin, well‑scoped helpers.

- “Auto‑OpenAPI from code”
  - Pros: fewer files at first.
  - Cons: drift and surprise are common; often leaky abstractions.
  - SMOZ: the OpenAPI you publish is what you wrote. No guessing.

## When to choose SMOZ

- You want a minimal toolkit that plays nicely with your existing stack.
- You need to stitch together hand‑crafted paths, not a full router.
- You want tests to hit small,
