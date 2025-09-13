/**
 * Dev-only types for authoring templates inside the SMOZ repo.
 * Not copied to downstream apps (excluded by init runner).
 * Resolves '@karmaniverous/smoz' to this repo's build output.
 */
declare module '@karmaniverous/smoz' {
  export * from '../../../dist/index.d.ts';
}
