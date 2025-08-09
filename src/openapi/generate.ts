import fs from 'fs-extra';
import path from 'path';
import { packageDirectorySync } from 'pkg-dir';
import { createDocument } from 'zod-openapi';

import { coresignal_companies } from '@/src/app/api/coresignal/companies/openapi';
import { coresignal_companies_trigger } from '@/src/app/api/coresignal/companies/trigger/openapi';
import { coresignal_jobs } from '@/src/app/api/coresignal/jobs/openapi';
import { data_company } from '@/src/app/api/data/company/openapi';
import { openai_assistants_assistantId } from '@/src/app/api/openai/assistants/[assistant_id]/openapi';
import { openai_assistants } from '@/src/app/api/openai/assistants/openapi';
import { openapi } from '@/src/app/api/openapi/openapi';

console.log('Generating OpenAPI document...');

const doc = createDocument({
  openapi: '3.1.0',
  servers: [
    { description: 'Production', url: 'https://ai.johngalt.id' },
    { description: 'Local dev', url: 'http://localhost:3000' },
  ],
  info: {
    title: process.env.npm_package_name ?? '',
    version: process.env.npm_package_version ?? '',
  },
  paths: {
    ...coresignal_companies,
    ...coresignal_companies_trigger,
    ...coresignal_jobs,
    ...data_company,
    ...openai_assistants,
    ...openai_assistants_assistantId,
    ...openapi,
  },
});

const pkgDir = packageDirectorySync();

fs.writeFileSync(
  path.join(pkgDir!, 'src/openapi', 'openapi.json'),
  JSON.stringify(doc, null, 2),
);

console.log('Done!');
