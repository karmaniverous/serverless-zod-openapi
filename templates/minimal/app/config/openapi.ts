import * as path from 'node:path';

import * as fs from 'fs-extra';
import { packageDirectorySync } from 'pkg-dir';
import { createDocument } from 'zod-openapi';

import { app } from '@/app/config/app.config';
import * as __register_openapi from '@/app/generated/register.openapi';
void __register_openapi;
console.log('Generating OpenAPI document...');

const paths = app.buildAllOpenApiPaths();
export const doc = createDocument({
  openapi: '3.1.0',
  servers: [{ description: 'Dev', url: 'http://localhost' }],
  info: {
    title: process.env.npm_package_name ?? 'smoz-app',
    version: process.env.npm_package_version ?? '0.0.0',
  },
  paths,
});

const pkgDir = packageDirectorySync();
if (!pkgDir) {
  throw new Error('Could not resolve package root directory');
}
const outDir = path.join(pkgDir, 'app', 'generated');
fs.ensureDirSync(outDir);
fs.writeFileSync(
  path.join(outDir, 'openapi.json'),
  JSON.stringify(doc, null, 2),
);

console.log('Done!');
