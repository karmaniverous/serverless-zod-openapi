/**
 * The security context of a request.
 *
 * - `my`: The request is authenticated as a user.
 * - `private`: The request is authenticated with an API key.
 * - `public`: The request is not authenticated.
 */
export type SecurityContext = 'my' | 'private' | 'public';
