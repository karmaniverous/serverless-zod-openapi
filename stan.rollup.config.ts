/** See <stanPath>/system/stan.project.md for global requirements. */

import { buildCli, buildLibrary, buildTypes } from './rollup.config';

const outputPath = '.stan/dist';

export default [
  buildCli(outputPath, 'tsconfig.rollup.json'),
  buildLibrary(outputPath, 'tsconfig.rollup.json'),
  buildTypes(outputPath),
];
