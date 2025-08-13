/**
 * Compatibility re-export to preserve the original import path:
 *   from "@/handler/wrapHandler"
 *
 * If you previously relied on a default export, add:
 *   export { default } from "./wrapHandler/index";
 * …but only if "./wrapHandler/index" actually has a default export.
 */
export * from "./wrapHandler/index";
