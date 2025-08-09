import fs from 'fs-extra';
import path from 'path';
import { packageDirectorySync } from 'pkg-dir';
import { createDocument } from 'zod-openapi';

import foo from '@/endpoints/foo/get/openapi';

console.log('Generating OpenAPI document...');

const doc = createDocument({
  openapi: '3.1.0',
  servers: [
    { description: 'Production', url: 'https://api.johngalt.id' },
    { description: 'Local dev', url: 'http://api.dev.johngalt.id' },
  ],
  info: {
    title: process.env.npm_package_name ?? '',
    version: process.env.npm_package_version ?? '',
  },
  paths: {
    ...foo,
  },
});

const pkgDir = packageDirectorySync();

fs.writeFileSync(
  path.join(pkgDir!, 'src/openapi', 'openapi.json'),
  JSON.stringify(doc, null, 2),
);

console.log('Done!');
