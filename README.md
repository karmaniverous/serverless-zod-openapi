<div align="center">

# SMOZ

[Serverless](https://www.serverless.com/) · [Middy](https://middy.js.org/) · [OpenAPI 3.1](https://spec.openapis.org/oas/latest.html) · [Zod](https://zod.dev/)

[![npm version](https://img.shields.io/npm/v/@karmaniverous/smoz.svg)](https://www.npmjs.com/package/@karmaniverous/smoz)
![Node Current](https://img.shields.io/node/v/@karmaniverous/smoz)
[![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/smoz)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](https://github.com/karmaniverous/smoz/tree/main/CHANGELOG.md)
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://github.com/karmaniverous/smoz/tree/main/LICENSE.md)

</div>

SMOZ is a small, pragmatic toolkit for authoring AWS Lambda handlers with
[Middy] and [Zod], then aggregating Serverless functions and hand‑crafted
OpenAPI 3.1 paths from a single, schema‑first application definition.

- Keep prod code testable and framework‑agnostic
- HTTP middleware with validation, shaping, errors, CORS, negotiation, and HEAD
- Non‑HTTP flows stay lean (no middleware overhead)

Quick links

- [Overview](https://docs.karmanivero.us/smoz/documents/Overview.html)
- [Why smoz?](https://docs.karmanivero.us/smoz/documents/Why_smoz_.html)
- [Getting started](https://docs.karmanivero.us/smoz/documents/Getting_started.html)
- 10-minute tour: https://docs.karmanivero.us/smoz/documents/docs-src_tour-10-minutes.html
- CLI: https://docs.karmanivero.us/smoz/cli
- Middleware: https://docs.karmanivero.us/smoz/middleware
- Templates: https://docs.karmanivero.us/smoz/templates
- Recipes: https://docs.karmanivero.us/smoz/recipes
- Examples (repo): https://github.com/karmaniverous/smoz/tree/main/examples
- Contributing: https://docs.karmanivero.us/smoz/contributing
  Install

```bash
npm i @karmaniverous/smoz zod zod-openapi @middy/core \
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

Docs and reference

- Docs site: https://docs.karmanivero.us/smoz
- Changelog: https://github.com/karmaniverous/smoz/tree/main/CHANGELOG.md
- License: BSD‑3‑Clause © Jason Williscroft

[Middy]: https://middy.js.org/
[Zod]: https://zod.dev/
