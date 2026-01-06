/**
 * Library barrel exports
 *
 * API Layer:
 * - adminFetch: Core fetch wrapper with cookie credentials and error handling
 * - apiGet/apiPost/apiPatch: Convenience wrappers for common HTTP methods
 *
 * All API calls automatically include:
 * - credentials: "include" (for httpOnly cookie authentication)
 * - Consistent JSON parsing
 * - Typed error handling via AdminApiError
 */
export {
  adminFetch,
  AdminApiError,
  apiGet,
  apiPost,
  apiPatch,
} from "./adminApi";
export * from "./utils";
