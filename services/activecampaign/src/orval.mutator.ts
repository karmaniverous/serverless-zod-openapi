// Re-export the published orval mutator so Orval can resolve a real file path.
// This preserves the desired upstream import while avoiding Orval's copy-to-generated error.
export { orvalMutator } from '@karmaniverous/cached-axios/mutators/orval';
