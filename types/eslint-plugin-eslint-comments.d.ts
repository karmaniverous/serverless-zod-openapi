declare module 'eslint-plugin-eslint-comments' {
  import type { Rule } from 'eslint';
  // Minimal plugin surface required by our config (rules registry only).
  export type EslintCommentsPlugin = {
    rules?: Record<string, Rule.RuleModule>;
  };
  const plugin: EslintCommentsPlugin;
  export default plugin;
}