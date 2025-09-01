/**
 * App (schema-first, class-based)
 * Requirements addressed:
 * - App is a CLASS, generic on GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema.
 * - eventTypeMapSchema defaults to baseEventTypeMapSchema (Zod), matching BaseEventTypeMap.
 * - No shims/back-compat: new registration surface (defineFunction) returns per-function API.
 * - Allow widening HTTP event tokens via app.httpEventTypeTokens (runtime). Defaults ['rest','http'].
 */
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { packageDirectorySync } from 'package-directory';
import { z, type ZodObject, type ZodRawShape } from 'zod';

import { baseEventTypeMapSchema } from '@/src/config/baseEventTypeMapSchema';
import type { EnvSchemaNode } from '@/src/config/defineAppConfig';
import { ENV_CONFIG } from '@/src/handler/defineFunctionConfig';
import { wrapHandler } from '@/src/handler/wrapHandler';
import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import type { BaseOperation } from '@/src/openapi/types';
import { buildPathElements } from '@/src/path/buildPath';
import { stagesFactory } from '@/src/serverless/stagesFactory';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

type ZodObj = ZodObject<ZodRawShape>;

export interface AppServerlessConfig {
  defaultHandlerFileName: string;
  defaultHandlerFileExport: string;
  httpContextEventMap: SecurityContextHttpEventMap;
}

export interface AppInit<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj = typeof baseEventTypeMapSchema,
> {
  globalParamsSchema: GlobalParamsSchema;
  stageParamsSchema: StageParamsSchema;
  eventTypeMapSchema?: EventTypeMapSchema;
  serverless: AppServerlessConfig;
  global: {
    params: z.infer<GlobalParamsSchema>;
    envKeys: readonly (keyof z.infer<GlobalParamsSchema>)[];
  };
  stage: {
    params: Record<string, z.infer<StageParamsSchema>>;
    envKeys: readonly (keyof z.infer<StageParamsSchema>)[];
  };
  /**
   * HTTP tokens to treat as HTTP at runtime (widenable).
   * Defaults to ['rest', 'http'].
   */
  httpEventTypeTokens?: readonly (keyof z.infer<
    EventTypeMapSchema extends ZodObj
      ? EventTypeMapSchema
      : typeof baseEventTypeMapSchema
  >)[];
}

type FunctionRegistration = {
  slug: string;
  functionName: string;
  eventType: string; // token (keyof EventTypeMap)
  // Optional HTTP-only fields
  method?: MethodKey;
  basePath?: string;
  httpContexts?: readonly HttpContext[];
  contentType?: string;
  // Env keys at function level
  fnEnvKeys?: readonly PropertyKey[];
  // Schemas
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
  // Attachments
  openapiBaseOperation?: BaseOperation;
  serverlessExtras?: unknown;
  // For path/handler derivations
  callerModuleUrl: string;
  endpointsRootAbs: string;
  // Branded config (for runtime env parsing)
  brandedConfig: Record<string, unknown>;
};

export class App<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj = typeof baseEventTypeMapSchema,
> {
  // Schemas
  public readonly globalParamsSchema: GlobalParamsSchema;
  public readonly stageParamsSchema: StageParamsSchema;
  public readonly eventTypeMapSchema: EventTypeMapSchema extends ZodObj
    ? EventTypeMapSchema
    : typeof baseEventTypeMapSchema;

  // Serverless config
  public readonly serverless: AppServerlessConfig;

  // Env exposure
  public readonly global: EnvSchemaNode<GlobalParamsSchema>;
  public readonly stage: EnvSchemaNode<StageParamsSchema>;

  // Derived stage artifacts
  public readonly stages: ReturnType<typeof stagesFactory>['stages'];
  public readonly environment: ReturnType<typeof stagesFactory>['environment'];
  public readonly buildFnEnv: ReturnType<typeof stagesFactory>['buildFnEnv'];

  // HTTP tokens for runtime decision
  public readonly httpEventTypeTokens: readonly string[];

  // Registry
  private readonly registry = new Map<string, FunctionRegistration>();

  private constructor(
    init: AppInit<GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema>,
  ) {
    this.globalParamsSchema = init.globalParamsSchema;
    this.stageParamsSchema = init.stageParamsSchema;
    // Default to base schema when omitted
    this.eventTypeMapSchema =
      (init.eventTypeMapSchema as EventTypeMapSchema) ??
      (baseEventTypeMapSchema as unknown as EventTypeMapSchema);
    this.serverless = init.serverless;

    // Validate that eventTypeMapSchema includes base keys at runtime
    const shape = (this.eventTypeMapSchema as ZodObj).shape ?? {};
    for (const k of ['rest', 'http', 'sqs'] as const) {
      if (!(k in shape)) {
        throw new Error(
          `eventTypeMapSchema is missing base key "${k}". Ensure it extends baseEventTypeMapSchema.`,
        );
      }
    }

    // Env exposure nodes
    this.global = {
      paramsSchema: this.globalParamsSchema,
      envKeys: init.global.envKeys,
    };
    this.stage = {
      paramsSchema: this.stageParamsSchema,
      envKeys: init.stage.envKeys,
    };

    // Build stages/environment/fn-env via factory
    const sf = stagesFactory({
      globalParamsSchema: this.globalParamsSchema,
      stageParamsSchema: this.stageParamsSchema,
      globalParams: init.global.params,
      globalEnvKeys: init.global.envKeys,
      stageEnvKeys: init.stage.envKeys,
      stages: init.stage.params,
    });
    this.stages = sf.stages;
    this.environment = sf.environment;
    this.buildFnEnv = sf.buildFnEnv;

    // HTTP tokens (runtime decision)
    const defaultHttpTokens = ['rest', 'http'] as const;
    this.httpEventTypeTokens = (init.httpEventTypeTokens ??
      defaultHttpTokens) as readonly string[];
  }

  /** Ergonomic constructor for schema-first inference. */
  static create<
    G extends ZodObj,
    S extends ZodObj,
    E extends ZodObj = typeof baseEventTypeMapSchema,
  >(init: AppInit<G, S, E>): App<G, S, E> {
    return new App(init);
  }

  /** Derive a stable, lowercase, POSIX slug from module location (overrideable per function). */
  private deriveSlug(
    endpointsRootAbs: string,
    callerModuleUrl: string,
  ): string {
    const rel = relative(
      endpointsRootAbs,
      dirname(fileURLToPath(callerModuleUrl)),
    )
      .split(sep)
      .join('/')
      .toLowerCase();
    // sanitize: keep safe chars, collapse repeats
    return rel
      .replace(/[^a-z0-9/_-]+/g, '-')
      .replace(/\/+/g, '/')
      .replace(/-+/g, '-')
      .replace(/^[-/]+|[-/]+$/g, '');
  }

  /** Register a function and return its per-function API (handler/openapi/serverless). */
  defineFunction<
    EventTypeMap extends z.infer<
      EventTypeMapSchema extends ZodObj
        ? EventTypeMapSchema
        : typeof baseEventTypeMapSchema
    >,
    EventType extends keyof EventTypeMap,
    EventSchema extends z.ZodType | undefined,
    ResponseSchema extends z.ZodType | undefined,
  >(options: {
    functionName: string;
    eventType: EventType;
    // Optional HTTP-only
    method?: MethodKey;
    basePath?: string;
    httpContexts?: readonly HttpContext[];
    contentType?: string;
    // Optional schemas
    eventSchema?: EventSchema;
    responseSchema?: ResponseSchema;
    // Optional env keys
    fnEnvKeys?: readonly (keyof (z.infer<GlobalParamsSchema> &
      z.infer<StageParamsSchema>))[];
    // Identity & slugging
    callerModuleUrl: string;
    endpointsRootAbs: string;
    slug?: string;
  }) {
    const slug =
      options.slug ??
      this.deriveSlug(options.endpointsRootAbs, options.callerModuleUrl);
    if (this.registry.has(slug)) {
      const other = this.registry.get(slug)!;
      throw new Error(
        `Duplicate function slug "${slug}". Existing: ${other.callerModuleUrl}. New: ${options.callerModuleUrl}. Provide a custom slug to disambiguate.`,
      );
    }

    // Brand a minimal config with env so wrapHandler can parse process.env at runtime.
    const brandedConfig = {
      functionName: options.functionName,
      eventType: options.eventType as string,
      ...(options.method ? { method: options.method } : {}),
      ...(options.basePath ? { basePath: options.basePath } : {}),
      ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
      ...(options.contentType ? { contentType: options.contentType } : {}),
      ...(options.fnEnvKeys ? { fnEnvKeys: options.fnEnvKeys } : {}),
      [ENV_CONFIG]: {
        global: this.global,
        stage: this.stage,
      } as {
        global: EnvSchemaNode<GlobalParamsSchema>;
        stage: EnvSchemaNode<StageParamsSchema>;
      },
    } as Record<string, unknown>;

    const reg: FunctionRegistration = {
      slug,
      functionName: options.functionName,
      eventType: options.eventType as string,
      method: options.method,
      basePath: options.basePath,
      httpContexts: options.httpContexts,
      contentType: options.contentType,
      fnEnvKeys: options.fnEnvKeys,
      eventSchema: options.eventSchema,
      responseSchema: options.responseSchema,
      callerModuleUrl: options.callerModuleUrl,
      endpointsRootAbs: options.endpointsRootAbs,
      brandedConfig,
    };
    this.registry.set(slug, reg);

    return {
      /** Wrapped AWS Lambda handler (HTTP or non-HTTP) */
      handler: <
        B extends (
          event: unknown,
          context: unknown,
          options: {
            env: Record<string, unknown>;
            securityContext?: unknown;
            logger: Console;
          },
        ) => Promise<unknown>,
      >(
        business: B,
      ) => {
        return wrapHandler(
          brandedConfig as unknown,
          business as unknown as (
            e: unknown,
            c: unknown,
            o: {
              env: Record<string, unknown>;
              securityContext?: unknown;
              logger: Console;
            },
          ) => Promise<unknown>,
          { httpEventTypeTokens: this.httpEventTypeTokens },
        );
      },
      /** Attach OpenAPI base operation info for this function */
      openapi: (baseOperation: BaseOperation) => {
        const r = this.registry.get(slug)!;
        r.openapiBaseOperation = baseOperation;
      },
      /** Attach non-HTTP serverless extras (e.g., SQS triggers) */
      serverless: (extras: unknown) => {
        const r = this.registry.get(slug)!;
        r.serverlessExtras = extras;
      },
    };
  }

  /** Aggregate Serverless function definitions across the registry. */
  buildAllServerlessFunctions(): AWS['functions'] {
    const out: AWS['functions'] = {};
    const repoRoot = packageDirectorySync()!;

    for (const r of this.registry.values()) {
      // Handler path
      const callerDir = dirname(fileURLToPath(r.callerModuleUrl));
      const handlerFileAbs = join(
        callerDir,
        this.serverless.defaultHandlerFileName,
      );
      const handlerFileRel = relative(repoRoot, handlerFileAbs)
        .split(sep)
        .join('/');
      const handler = `${handlerFileRel}.${this.serverless.defaultHandlerFileExport}`;

      let events: unknown = [];
      // HTTP decision: runtime widenable
      const isHttp = this.httpEventTypeTokens.includes(r.eventType);
      if (isHttp) {
        // Build method/path from stored fields or derive from layout
        const { method, basePath, contexts } = resolveHttpFromFunctionConfig(
          {
            functionName: r.functionName,
            eventType: r.eventType as keyof BaseEventTypeMap,
            ...(r.method ? { method: r.method } : {}),
            ...(r.basePath ? { basePath: r.basePath } : {}),
            ...(r.httpContexts ? { httpContexts: r.httpContexts } : {}),
          } as unknown as {
            functionName: string;
            eventType: keyof BaseEventTypeMap;
            method?: MethodKey;
            basePath?: string;
            httpContexts?: readonly HttpContext[];
          },
          r.callerModuleUrl,
          r.endpointsRootAbs,
        );
        const path = `/${basePath.replace(/^\/+/, '')}`;
        const ctxs = contexts.length ? contexts : (['public'] as const);
        events = ctxs.map(() => ({
          http: {
            method,
            path,
          },
        }));
      } else {
        events = r.serverlessExtras ?? [];
      }

      const def: Record<string, unknown> = {
        handler,
        events,
        environment: this.buildFnEnv((r.fnEnvKeys ?? []) as readonly never[]),
      };

      out[r.functionName] = def as unknown;
    }

    return out;
  }

  /** Aggregate OpenAPI paths across the registry. */
  buildAllOpenApiPaths(): Record<string, unknown> {
    const paths: Record<string, unknown> = {};

    for (const r of this.registry.values()) {
      const isHttp = this.httpEventTypeTokens.includes(r.eventType);
      if (!isHttp || !r.openapiBaseOperation) continue;

      const { method, basePath, contexts } = resolveHttpFromFunctionConfig(
        {
          functionName: r.functionName,
          eventType: r.eventType as keyof BaseEventTypeMap,
          ...(r.method ? { method: r.method } : {}),
          ...(r.basePath ? { basePath: r.basePath } : {}),
          ...(r.httpContexts ? { httpContexts: r.httpContexts } : {}),
        } as unknown as {
          functionName: string;
          eventType: keyof BaseEventTypeMap;
          method?: MethodKey;
          basePath?: string;
          httpContexts?: readonly HttpContext[];
        },
        r.callerModuleUrl,
        r.endpointsRootAbs,
      );

      const ctxs = (
        contexts.length ? contexts : (['public'] as const)
      ) as readonly HttpContext[];
      for (const context of ctxs) {
        const elems = buildPathElements(basePath, context);
        const pathKey = `/${elems.join('/')}`;
        const op = {
          ...r.openapiBaseOperation,
          operationId: [...elems, method].join('_'),
          summary: `${r.openapiBaseOperation.summary} (${context})`,
          tags: Array.from(
            new Set([...(r.openapiBaseOperation.tags ?? []), context]),
          ),
        };
        const existing = (paths[pathKey] as Record<string, unknown>) ?? {};
        paths[pathKey] = {
          ...existing,
          [method]: op,
        };
      }
    }

    return paths;
  }
}
