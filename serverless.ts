import type { AWS } from '@serverless/typescript';

import endpointEventActivecampaignPost from '@@/src/lambdas/endpoints/event/activecampaign/post/serverless';
import endpointFooGet from '@@/src/lambdas/endpoints/foo/get/serverless';
import endpointOpenapiGet from '@@/src/lambdas/endpoints/openapi/get/serverless';
import { environment, stages } from '@@/src/serverless/config/stages';

const config: AWS = {
  service: '${param:SERVICE_NAME}',
  frameworkVersion: '4',
  plugins: [
    'serverless-apigateway-log-retention',
    'serverless-deployment-bucket',
    'serverless-domain-manager',
    'serverless-plugin-common-excludes',
  ],
  package: {
    individually: true,
    patterns: ['!**/?(*.)test.+(!(.))'],
  },
  custom: {
    apiGatewayLogRetention: {
      accessLogging: {
        enabled: true,
        days: 5,
      },
      executionLogging: {
        enabled: false,
      },
    },
    customDomain: {
      autoDomain: true,
      basePath: '',
      certificateArn: '${param:DOMAIN_CERTIFICATE_ARN}',
      domainName: '${param:DOMAIN_NAME}',
      preserveExternalPathMappings: true,
    },
    deploymentBucket: {
      accelerate: true,
      blockPublicAccess: true,
    },
  },
  stages,
  provider: {
    apiGateway: {
      apiKeys: ['${param:SERVICE_NAME}-${param:STAGE}'],
      disableDefaultEndpoint: true,
    },
    apiName: '${param:SERVICE_NAME}',
    deploymentBucket: {
      name: '${param:SERVICE_NAME}-deployment',
      serverSideEncryption: 'AES256',
    },
    deploymentMethod: 'direct',
    endpointType: 'edge',
    environment,
    iam: {
      role: {
        managedPolicies: [
          'arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy',
        ],
        statements: [{ Effect: 'Allow', Action: '*', Resource: '*' }],
      },
    },
    logRetentionInDays: 5,
    logs: {
      lambda: {
        logFormat: 'JSON',
      },
      restApi: {
        accessLogging: true,
        executionLogging: false,
        format:
          '{ "accountId": "$context.accountId", "apiId": "$context.apiId", "domainName": "$context.domainName", "domainPrefix": "$context.domainPrefix", "error": { "message": "$context.error.message", "responseType": "$context.error.responseType" }, "extendedRequestId": "$context.extendedRequestId", "httpMethod": "$context.httpMethod", "identity" { "accountId": "$context.identity.accountId", "apiKey": "$context.identity.apiKey", "caller": "$context.identity.caller", "clientCert": { "clientCertPem": "$context.identity.clientCert.clientCertPem", "subjectDN": "$context.identity.clientCert.subjectDN", "issuerDN": "$context.identity.clientCert.issuerDN", "serialNumber": "$context.identity.clientCert.serialNumber", "validity": { "notBefore": "$context.identity.clientCert.validity.notBefore", "notAfter": "$context.identity.clientCert.validity.notAfter" } }, "sourceIp": "$context.identity.sourceIp", "user": "$context.identity.user", "userArn": "$context.identity.userArn", "userAgent": "$context.identity.userAgent", }, "integration": { "latency": "$context.integration.latency" }, "path": "$context.path", "protocol": "$context.protocol", "requestId": "$context.requestId", "requestTime": "$context.requestTime", "requestTimeEpoch": "$context.requestTimeEpoch", "resourceId": "$context.resourceId", "resourcePath": "$context.resourcePath", "stage": "$context.stage", "responseLatency": "$context.responseLatency", "responseLength": "$context.responseLength", "status": "$context.status" }',
      },
    },
    memorySize: 256,
    name: 'aws',
    region: '${param:REGION}' as NonNullable<AWS['provider']['region']>,
    runtime: 'nodejs22.x',
    profile: '${param:PROFILE}',
    stackName: '${param:SERVICE_NAME}-${param:STAGE}',
    stackTags: {
      service: '${param:SERVICE_NAME}',
      stage: '${param:STAGE}',
    },
    stage: '${opt:stage, "dev"}',
    tracing: {
      apiGateway: true,
      lambda: true,
    },
    versionFunctions: false,
  },
  functions: {
    ...endpointEventActivecampaignPost,
    ...endpointFooGet,
    ...endpointOpenapiGet,
  },
  build: {
    esbuild: {
      bundle: true,
      minify: '${param:ESB_MINIFY}' as unknown as boolean,
      sourcemap: '${param:ESB_SOURCEMAP}' as unknown as boolean,
      exclude: ['@aws-sdk/*'],
      target: 'node22',
      platform: 'node',
      define: {
        'require.resolve': undefined,
      },
    },
  },
};

export default config;
