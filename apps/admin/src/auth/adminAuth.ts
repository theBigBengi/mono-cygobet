/**
 * Admin Authentication API Client
 *
 * This module provides low-level API functions for admin authentication.
 * All functions use adminFetch which automatically includes:
 * - credentials: "include" (for httpOnly cookie authentication)
 * - Consistent error handling
 * - JSON parsing
 *
 * Authentication Flow:
 * 1. login() - POST /admin/auth/login → Sets httpOnly cookie on success
 * 2. me() - GET /admin/auth/me → Validates cookie and returns user data
 * 3. logout() - POST /admin/auth/logout → Clears cookie
 */

import type { AdminMeResponse } from "@repo/types/http/admin";
import { adminFetch } from "@/lib/adminApi";

/**
 * Authenticate admin user with email and password.
 *
 * On success, the server sets an httpOnly cookie (admin_session) that is
 * automatically included in subsequent requests via credentials: "include".
 *
 * @param email - Admin user email
 * @param password - Admin user password
 * @throws {AdminApiError} If credentials are invalid (401) or other API error
 */
export async function login(email: string, password: string): Promise<void> {
  await adminFetch<unknown>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Logout the current admin user.
 *
 * Clears the httpOnly session cookie on the server. The cookie is automatically
 * removed from the browser on the next request.
 *
 * @throws {AdminApiError} If API call fails
 */
export async function logout(): Promise<void> {
  await adminFetch<unknown>("/admin/auth/logout", { method: "POST" });
}

/**
 * Get current authenticated admin user information.
 *
 * Validates the session cookie and returns user data if authenticated.
 * Used for:
 * - Initial auth check on app load (bootstrap)
 * - Verifying session is still valid
 *
 * @returns User data (id, email, role, name)
 * @throws {AdminApiError} If not authenticated (401/403) or other API error
 */
export async function me(): Promise<AdminMeResponse> {
  return adminFetch<AdminMeResponse>("/admin/auth/me", { method: "GET" });
}
