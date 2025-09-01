/**
 * App (schema-first, class-based)
 * Requirements addressed:
 * - App is a CLASS, generic on GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema.
 * - eventTypeMapSchema defaults to baseEventTypeMapSchema (Zod), matching BaseEventTypeMap.
 * - No shims/back-compat: new registration surface (defineFunction) returns per-function API.
 * - Allow widening HTTP event tokens via app.httpEventTypeTokens (runtime). Defaults ['rest','http'].
 */
import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { buildAllOpenApiPaths as buildPaths } from '@/src/app/buildOpenApi';
import { buildAllServerlessFunctions as buildFns } from '@/src/app/buildServerless';
import { handlerFactory } from '@/src/app/handlerFactory';
import {
  defaultHttpEventTypeTokens,
  validateEventTypeMapSchemaIncludesBase,
} from '@/src/app/httpTokens';
import { deriveSlug } from '@/src/app/slug';
import type { ZodObj } from '@/src/app/types';
import { baseEventTypeMapSchema } from '@/src/config/baseEventTypeMapSchema';
import type { EnvSchemaNode } from '@/src/config/defineAppConfig';
import type { EnvAttached } from '@/src/handler/defineFunctionConfig';
import { ENV_CONFIG } from '@/src/handler/defineFunctionConfig';
import type { BaseOperation } from '@/src/openapi/types';
import { stagesFactory } from '@/src/serverless/stagesFactory';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';
import type { HttpContext } from '@/src/types/HttpContext';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

export interface AppServerlessConfig {
  defaultHandlerFileName: string;
  defaultHandlerFileExport: string;
  httpContextEventMap: SecurityContextHttpEventMap;
}

export interface AppInit<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
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
  httpEventTypeTokens?: readonly (keyof z.infer<EventTypeMapSchema>)[];
}

type FunctionRegistration = {
  slug: string;
  functionName: string;
  eventType: string; // token
  // Optional HTTP-only fields (only present when provided)
  method?: MethodKey;
  basePath?: string;
  httpContexts?: readonly HttpContext[];
  contentType?: string;
  // Env keys at function level
  fnEnvKeys?: readonly PropertyKey[];
  // Schemas (present only when provided)
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
  EventTypeMapSchema extends ZodObj,
> {
  // Schemas
  public readonly globalParamsSchema: GlobalParamsSchema;
  public readonly stageParamsSchema: StageParamsSchema;
  public readonly eventTypeMapSchema: EventTypeMapSchema;

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
    // Default to base schema when omitted (apply default INSIDE the function)
    this.eventTypeMapSchema = (init.eventTypeMapSchema ??
      baseEventTypeMapSchema) as EventTypeMapSchema;
    this.serverless = init.serverless;

    // Validate that eventTypeMapSchema includes base keys at runtime
    validateEventTypeMapSchemaIncludesBase(
      (this.eventTypeMapSchema as ZodObj).shape as Record<string, unknown>,
    );

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
    this.httpEventTypeTokens = (init.httpEventTypeTokens ??
      defaultHttpEventTypeTokens) as readonly string[];
  }

  /** Ergonomic constructor for schema-first inference. */
  static create<
    GlobalParamsSchema extends ZodObj,
    StageParamsSchema extends ZodObj,
    EventTypeMapSchema extends ZodObj,
  >(
    init: AppInit<GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema>,
  ): App<GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema> {
    return new App(init);
  }

  /** Register a function and return its per-function API (handler/openapi/serverless). */
  defineFunction<
    EventType extends Extract<keyof z.infer<EventTypeMapSchema>, string>,
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
      deriveSlug(options.endpointsRootAbs, options.callerModuleUrl);
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
      ...(options.fnEnvKeys
        ? { fnEnvKeys: options.fnEnvKeys as readonly PropertyKey[] }
        : {}),
      ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
      ...(options.responseSchema
        ? { responseSchema: options.responseSchema }
        : {}),
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
      ...(options.method ? { method: options.method } : {}),
      ...(options.basePath ? { basePath: options.basePath } : {}),
      ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
      ...(options.contentType ? { contentType: options.contentType } : {}),
      ...(options.fnEnvKeys
        ? { fnEnvKeys: options.fnEnvKeys as readonly PropertyKey[] }
        : {}),
      ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
      ...(options.responseSchema
        ? { responseSchema: options.responseSchema }
        : {}),
      callerModuleUrl: options.callerModuleUrl,
      endpointsRootAbs: options.endpointsRootAbs,
      brandedConfig,
    };
    this.registry.set(slug, reg);

    return {
      /** Wrapped AWS Lambda handler (HTTP or non-HTTP) */
      handler: (
        business: Handler<
          EventSchema,
          ResponseSchema,
          (z.infer<EventTypeMapSchema> & BaseEventTypeMap)[EventType]
        >,
      ) => {
        type GlobalParams = z.infer<GlobalParamsSchema>;
        type StageParams = z.infer<StageParamsSchema>;
        type EventTypeMapResolved = z.infer<EventTypeMapSchema> &
          BaseEventTypeMap;
        type FC = FunctionConfig<
          EventSchema,
          ResponseSchema,
          GlobalParams,
          StageParams,
          EventTypeMapResolved,
          EventType
        > &
          EnvAttached<GlobalParamsSchema, StageParamsSchema>;

        const functionConfig = brandedConfig as unknown as FC;

        const make = handlerFactory<
          GlobalParamsSchema,
          StageParamsSchema,
          EventTypeMapResolved,
          EventType,
          EventSchema,
          ResponseSchema
        >(this.httpEventTypeTokens);
        return make(functionConfig, business);
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
    return buildFns(this.registry.values(), this.serverless, this.buildFnEnv);
  }

  /** Aggregate OpenAPI paths across the registry. */
  buildAllOpenApiPaths(): ZodOpenApiPathsObject {
    return buildPaths(this.registry.values());
  }
}
