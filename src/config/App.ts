/**
 * App (schema-first, class-based)
 * Requirements addressed:
 * - App is a CLASS, generic on GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema.
 * - eventTypeMapSchema defaults to baseEventTypeMapSchema (Zod), matching BaseEventTypeMap.
 * - No shims/back-compat: new registration surface (defineFunction) returns per-function API.
 * - Allow widening HTTP event tokens via app.httpEventTypeTokens (runtime). Defaults ['rest','http'].
 */
import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { z, type ZodObject, type ZodRawShape } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { buildAllOpenApiPaths as buildPaths } from '@/src/app/buildOpenApi';
import { buildAllServerlessFunctions as buildFns } from '@/src/app/buildServerless';
import {
  defaultHttpEventTypeTokens,
  validateEventTypeMapSchemaIncludesBase,
} from '@/src/app/httpTokens';
import { createRegistry } from '@/src/app/registry';
import type { ZodObj } from '@/src/app/types';
import { baseEventTypeMapSchema } from '@/src/config/baseEventTypeMapSchema';
import type { EnvSchemaNode } from '@/src/config/defineAppConfig';
import { stagesFactory } from '@/src/serverless/stagesFactory';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

/** Serverless config schema (parsed internally by App). */
const serverlessConfigSchema = z.object({
  httpContextEventMap: z.custom<SecurityContextHttpEventMap>(),
  defaultHandlerFileName: z.string().min(1),
  defaultHandlerFileExport: z.string().min(1),
});
export type AppServerlessConfig = z.infer<typeof serverlessConfigSchema>;

export interface AppInit<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
> {
  appRootAbs: string;
  globalParamsSchema: GlobalParamsSchema;
  stageParamsSchema: StageParamsSchema;
  eventTypeMapSchema?: EventTypeMapSchema /** Accept raw serverless config; App will parse it internally. */;
  serverless: z.input<typeof serverlessConfigSchema>;
  global: {
    params: z.infer<GlobalParamsSchema>;
    envKeys: readonly (keyof z.infer<GlobalParamsSchema>)[];
  };
  stage: {
    /** Accept raw stage param objects; App will parse with (global.partial + stage) */
    params: Record<string, Record<string, unknown>>;
    envKeys: readonly (keyof z.infer<StageParamsSchema>)[];
  };
  /**
   * HTTP tokens to treat as HTTP at runtime (widenable).
   * Defaults to ['rest', 'http'].   */
  httpEventTypeTokens?: readonly (keyof z.infer<EventTypeMapSchema>)[];
}

export class App<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
> {
  // Schemas
  public readonly appRootAbs: string;
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

  // Registry (delegated to src/app/registry)
  private readonly registry: ReturnType<
    typeof createRegistry<
      GlobalParamsSchema,
      StageParamsSchema,
      EventTypeMapSchema
    >
  >;

  private constructor(
    init: AppInit<GlobalParamsSchema, StageParamsSchema, EventTypeMapSchema>,
  ) {
    this.appRootAbs = init.appRootAbs.replace(/\\/g, '/');
    this.globalParamsSchema = init.globalParamsSchema;
    this.stageParamsSchema = init.stageParamsSchema;
    // Default to base schema when omitted (apply default INSIDE the function)
    this.eventTypeMapSchema = (init.eventTypeMapSchema ??
      baseEventTypeMapSchema) as EventTypeMapSchema;
    // Parse serverless input internally
    this.serverless = serverlessConfigSchema.parse(init.serverless);

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
    // Apply "stage extends global" implicitly: accept stage keys plus optional global overrides.
    const effectiveStageParamsSchema = this.globalParamsSchema
      .partial()
      .extend(
        (this.stageParamsSchema as unknown as ZodObject<ZodRawShape>)
          .shape as Record<string, z.ZodType>,
      );

    const sf = stagesFactory({
      globalParamsSchema: this.globalParamsSchema,
      stageParamsSchema: effectiveStageParamsSchema,
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

    // Initialize function registry
    this.registry = createRegistry<
      GlobalParamsSchema,
      StageParamsSchema,
      EventTypeMapSchema
    >({
      httpEventTypeTokens: this.httpEventTypeTokens,
      env: { global: this.global, stage: this.stage },
    });
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

  /**
   * Authoring interface for function registration.
   * functionName is optional — defaults from appRootAbs + callerModuleUrl.
   */
  public defineFunction<
    EventType extends Extract<keyof z.infer<EventTypeMapSchema>, string>,
    EventSchema extends z.ZodType | undefined,
    ResponseSchema extends z.ZodType | undefined,
  >(options: {
    functionName?: string;
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
    // Identity & roots
    callerModuleUrl: string;
    endpointsRootAbs: string;
  }) {
    const functionName =
      options.functionName ??
      (() => {
        const callerDir = dirname(fileURLToPath(options.callerModuleUrl));
        const rel = relative(this.appRootAbs, callerDir).split(sep).join('/');
        const parts = rel.split('/').filter(Boolean);
        return parts.join('_'); // underscore formatting
      })();

    return this.registry.defineFunction<EventType, EventSchema, ResponseSchema>(
      {
        functionName,
        eventType: options.eventType,
        ...(options.method ? { method: options.method } : {}),
        ...(options.basePath ? { basePath: options.basePath } : {}),
        ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
        ...(options.responseSchema
          ? { responseSchema: options.responseSchema }
          : {}),
        ...(options.fnEnvKeys ? { fnEnvKeys: options.fnEnvKeys } : {}),
        callerModuleUrl: options.callerModuleUrl,
        endpointsRootAbs: options.endpointsRootAbs,
      },
    );
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
