// Local wrapper for Orval's mutator.
// Orval validates that the mutator file exports a named function with the
// configured name. We forward to the upstream implementation to preserve
// behavior while satisfying Orval's static export check.
import {
  orvalMutator as upstreamOrvalMutator,
} from '@karmaniverous/cached-axios/mutators/orval';

export function orvalMutator(
  ...args: Parameters<typeof upstreamOrvalMutator>
): ReturnType<typeof upstreamOrvalMutator> {
  return upstreamOrvalMutator(...args);
}