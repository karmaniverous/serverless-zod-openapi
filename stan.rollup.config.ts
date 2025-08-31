/** See <stanPath>/system/stan.project.md for global requirements. */

import { buildLibrary, buildTypes } from './rollup.config';

const outputPath = '.stan/dist';
const tsconfigForStan = 'tsconfig.stan.rollup.json';

export default [buildLibrary(outputPath, tsconfigForStan), buildTypes(outputPath)];