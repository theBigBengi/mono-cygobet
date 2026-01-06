/**
 * Admin Authentication Module
 *
 * Barrel export for all authentication-related functionality.
 *
 * Exports:
 * - AdminAuthProvider: React context provider for auth state
 * - useAdminAuth: Hook to access auth state and actions
 * - AdminGuard: Component to protect routes
 * - login, logout, me: Low-level API functions
 *
 * Usage:
 * ```tsx
 * import { AdminAuthProvider, useAdminAuth, AdminGuard } from "@/auth";
 * ```
 *
 * @see AUTH_FLOW.md for detailed authentication flow documentation
 */
export { AdminAuthProvider, useAdminAuth } from "./useAdminAuth";
export { AdminGuard } from "./AdminGuard";
export * from "./adminAuth";
