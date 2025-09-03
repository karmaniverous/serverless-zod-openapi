/**
 * App (schema‑first)
 *
 * Central orchestrator for a SMOZ application. You provide:
 * - Global/stage parameter schemas and env exposure keys
 * - Serverless defaults (handler filename/export and context map)
 * - Event‑type map schema (extendable: e.g., add 'step')
 *
 * The instance:
 * - Validates configuration
 * - Exposes env and stage artifacts for Serverless (provider.environment and params)
 * - Provides a registry to define functions (HTTP and non‑HTTP)
 * - Aggregates artifacts:
 *   - buildAllServerlessFunctions(): AWS['functions']
 *   - buildAllOpenApiPaths(): ZodOpenApiPathsObject
 *
 * @remarks See README for a full quick‑start, and typedoc for detailed API docs.
 */
import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { baseEventTypeMapSchema } from '@/src/core/baseEventTypeMapSchema';
import { buildStageArtifacts } from '@/src/core/buildStageArtifacts';
import type { EnvSchemaNode } from '@/src/core/defineAppConfig';
import {
  defaultHttpEventTypeTokens,
  validateEventTypeMapSchemaIncludesBase,
} from '@/src/core/httpTokens';
import { createRegistry } from '@/src/core/registry';
import { type AppServerlessConfig, serverlessConfigSchema } from '@/src/core/serverlessConfig';
import type { ZodObj } from '@/src/core/types';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import { buildAllOpenApiPaths as buildPaths } from '@/src/openapi/buildOpenApi';
import { buildAllServerlessFunctions as buildFns } from '@/src/serverless/buildServerless';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';

export interface AppInit<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,> {
  appRootAbs: string;
  globalParamsSchema: GlobalParamsSchema;
  stageParamsSchema: StageParamsSchema;
  eventTypeMapSchema?: EventTypeMapSchema;
  /** Accept raw serverless config; App will parse it internally. */
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
   * Defaults to ['rest', 'http'].
   */
  httpEventTypeTokens?: readonly (keyof z.infer<EventTypeMapSchema>)[];
  /**
   * Optional app-level HTTP middleware customization (defaults & profiles).
   */
  http?: AppHttpConfig;
}
/**
 * Application class.
 *
 * @typeParam GlobalParamsSchema - Zod object schema for global parameters
 * @typeParam StageParamsSchema  - Zod object schema for per‑stage parameters
 * @typeParam EventTypeMapSchema - Zod object schema mapping event tokens to runtime types
 */ export class App<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
> {
  /** Helper alias for stage artifacts type */
  private static readonly _stageArtifactsType = null as unknown as ReturnType<typeof buildStageArtifacts>;
  public readonly appRootAbs: string;
  // Schemas
  public readonly globalParamsSchema: GlobalParamsSchema;
  public readonly stageParamsSchema: StageParamsSchema;
  public readonly eventTypeMapSchema: EventTypeMapSchema;  // Serverless config
  public readonly serverless: AppServerlessConfig;

  // Env exposure
  public readonly global: EnvSchemaNode<GlobalParamsSchema>;
  public readonly stage: EnvSchemaNode<StageParamsSchema>;

  // Derived stage artifacts
  public readonly stages: ReturnType<typeof buildStageArtifacts>['stages'];
  public readonly environment: ReturnType<typeof buildStageArtifacts>['environment'];
  public readonly buildFnEnv: ReturnType<typeof buildStageArtifacts>['buildFnEnv'];

  public readonly http: AppHttpConfig;
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

    // Build stages/environment/fn-env via helper (applies “stage extends global” and parsing)
    const { stages, environment, buildFnEnv } = buildStageArtifacts(
      this.globalParamsSchema,
      this.stageParamsSchema,
      { params: init.global.params, envKeys: init.global.envKeys },
      { params: init.stage.params, envKeys: init.stage.envKeys },
    );
    this.stages = stages;
    this.environment = environment;
    this.buildFnEnv = buildFnEnv;

    // HTTP tokens (runtime decision)
    this.httpEventTypeTokens = (init.httpEventTypeTokens ??
      defaultHttpEventTypeTokens) as readonly string[];
    // App-level HTTP customization
    this.http = init.http ?? {};
    // Initialize function registry
    this.registry = createRegistry<
      GlobalParamsSchema,
      StageParamsSchema,
      EventTypeMapSchema
    >({
      httpEventTypeTokens: this.httpEventTypeTokens,
      env: { global: this.global, stage: this.stage },
      http: this.http,
    });
  }
  /**
   * Ergonomic constructor for schema‑first inference.
   *
   * @param init - initialization object (schemas, serverless defaults, params/envKeys)
   * @returns a new App instance
   */
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
   * Register a function (HTTP or non‑HTTP).
   *
   * @typeParam EventType      - A key from your eventTypeMapSchema (e.g., 'rest' | 'http' | 'sqs' | 'step')
   * @typeParam EventSchema    - Optional Zod schema validated BEFORE the handler (refines event shape)
   * @typeParam ResponseSchema - Optional Zod schema validated AFTER the handler (refines response shape)
   * @param options - per‑function configuration (method/basePath/httpContexts for HTTP; serverless extras for non‑HTTP)
   * @returns a per‑function API: { handler(business), openapi(baseOperation), serverless(extras) }
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
        // Drop leading 'app' segment if present, per repo convention
        if (parts[0] === 'app') parts.shift();
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

  /**
   * Aggregate Serverless function definitions across the registry.
   *
   * @returns An AWS['functions'] object suitable for serverless.ts
   */
  buildAllServerlessFunctions(): AWS['functions'] {
    return buildFns(this.registry.values(), this.serverless, this.buildFnEnv);
  }

  /**
   * Aggregate OpenAPI path items across the registry.
   *
   * @returns ZodOpenApiPathsObject to be embedded in a full OpenAPI document
   */
  buildAllOpenApiPaths(): ZodOpenApiPathsObject {
    return buildPaths(this.registry.values());
  }
}
