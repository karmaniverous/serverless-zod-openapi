import type { AWS } from '@serverless/typescript';

export type Stage = NonNullable<AWS['stages']>[string];
