/**
 * Public barrel for middleware utilities.
 * Preserves import stability after the reorg (stack.ts -> buildStack.ts).
 *
 * Example (unchanged):
 *   import { buildMiddlewareStack } from "@/handler/middleware";
 */
export { buildMiddlewareStack } from './buildStack';
