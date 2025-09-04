declare module 'eslint-plugin-eslint-comments' {
  import type { Linter } from 'eslint';
  // Minimal plugin surface required by our config (rules registry only).
  export type EslintCommentsPlugin = {
    rules?: Record<string, Linter.RuleModule>;
  };
  const plugin: EslintCommentsPlugin;
  export default plugin;
}