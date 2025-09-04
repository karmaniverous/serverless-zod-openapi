/**
 * This script generates an OpenAPI 3.1.0 specification document for the API.
 *
 * It uses the `zod-openapi` library to create the document from JSDoc-annotated
 * Zod schemas. The generated document is written to `src/openapi/openapi.json`.
 *
 * @see https://github.com/johngalt/zod-openapi */
// side-effect registrations (moved under app/functions)
import '@/app/functions/rest/openapi/get/lambda';
import '@/app/functions/rest/openapi/get/openapi';
import '@/app/functions/rest/event/activecampaign/post/lambda';
import '@/app/functions/rest/event/activecampaign/post/openapi';

import fs from 'fs-extra';
import path from 'path';
import { packageDirectorySync } from 'pkg-dir';
import { createDocument } from 'zod-openapi';

import { app } from '@/app/config/app.config';

console.log('Generating OpenAPI document...');
/**
 * The OpenAPI document object.
 *
 * @see https://spec.openapis.org/oas/v3.1.0
 */
const paths = app.buildAllOpenApiPaths();
export const doc = createDocument({
  openapi: '3.1.0',
  servers: [
    { description: 'Production', url: 'https://api.johngalt.id' },
    { description: 'Local dev', url: 'http://api.dev.johngalt.id' },
  ],
  info: {
    // Read the package name and version from `package.json` via environment variables.
    title: process.env.npm_package_name ?? '',
    version: process.env.npm_package_version ?? '',
  },
  paths,
});

/**
 * The root directory of the package.
 */
const pkgDir = packageDirectorySync();

// Write the generated OpenAPI document to `app/generated/openapi.json`.
const outDir = path.join(pkgDir!, 'app', 'generated');
fs.ensureDirSync(outDir);
fs.writeFileSync(
  path.join(outDir, 'openapi.json'),
  JSON.stringify(doc, null, 2),
);

console.log('Done!');