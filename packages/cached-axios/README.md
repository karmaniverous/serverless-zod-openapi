# Axios Package (`@workspace/axios`)

This package provides the **shared HTTP client** and **cache tooling** used across all services.

## Features

- **Axios Cache Interceptor (ACI)** integration
  - In-memory caching by default (can swap for Redis in the future)
  - `etag` / `last-modified` revalidation
  - `stale-if-error` support
- **Global cache ID & tag registry**
  - Built from a strict [Zod v4](https://zod.dev) schema
  - Type-safe `id()` / `tag()` functions at every registry node
  - Numbers and strings supported as ID segments
- **Tag-indexed invalidation**
  - `withQuery()` automatically registers tags when a request is cached
  - `withMutation()` invalidates all cache IDs associated with given tags
- **Orval-compatible mutator**
  - Allows generated API clients to use the shared axios instance automatically

## Structure

```
src/
  http.ts        # Shared ACI-enhanced axios instance
  config.ts      # Zod schema & id/tag builder
  cache.ts       # withQuery / withMutation helpers
  mutator.ts     # Orval mutator
  index.ts       # Barrel exports
  augmentation.d.ts # Adds 'cache' property types to AxiosRequestConfig
```

## Usage

### 1. Create a cache config for a service

```ts
// services/myservice/src/api/config.ts
import { buildConfig, ConfigInputSchema } from 'axios';

export const myConfigInput = {
  widgets: {
    detail: undefined,
    list: { any: undefined },
  },
} as const;

ConfigInputSchema.parse(myConfigInput);

export const cacheConfig = buildConfig(myConfigInput);

// Examples
cacheConfig.widgets.detail.id(42); // "widgets:detail:42"
cacheConfig.widgets.list.any.tag(); // "widgets:list:any"
```

### 2. Wrap generated endpoints

```ts
import { withQuery, withMutation } from 'axios';
import { cacheConfig } from '../api/config';
import { getWidgets } from '../../generated/widgets/widgets';
import { serviceDefaults } from '../http';

export const fetchWidget = async (id: number) => {
  return withQuery(
    (opts) => getWidgets().getWidgetById(id, { ...serviceDefaults(), ...opts }),
    cacheConfig.widgets.detail.id(id),
    [cacheConfig.widgets.detail.tag(id), cacheConfig.widgets.list.any.tag()],
  );
};
```

### 3. Use the Orval mutator

In your service’s `orval.config.ts`:

```ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'src/openapi.json',
    output: {
      client: 'axios',
      mode: 'tags-split',
      target: 'api.ts',
      workspace: 'generated',
      override: {
        mutator: {
          path: '../../packages/axios/src/mutator.ts',
          name: 'orvalMutator',
        },
      },
    },
  },
});
```

Now, all generated requests go through the shared axios instance.

---

## Future

- Redis-backed storage for distributed caching
- Built-in tag grouping rules for smarter invalidation
