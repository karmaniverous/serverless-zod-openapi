import common from './common';
import dev from './dev';
import prod from './prod';
import test from './test';

const envs = { dev, prod, test };

export const stages = Object.entries(envs).reduce(
  (acc, [key, env]) => ({ ...acc, [key]: env }),
  { default: common },
);

const keys = Object.values(envs)
  .reduce(
    (acc, env) => [...new Set([...acc, ...Object.keys(env)])],
    Object.keys(common),
  )
  .filter((key) => !/^(observability|resolvers)$/.test(key));

export const environment = Object.fromEntries(
  keys.map((key) => [key, `\${param:key}`]),
);
