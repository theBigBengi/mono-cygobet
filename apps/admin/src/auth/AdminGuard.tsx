/**
 * Admin Route Guard Component
 *
 * Protects routes by checking authentication status and redirecting unauthenticated users.
 *
 * Flow:
 * 1. Checks auth status from useAdminAuth()
 * 2. If "idle" or "loading" → Shows loading spinner (waiting for bootstrap)
 * 3. If "guest" → Redirects to /login with return path
 * 4. If "authed" → Renders children (protected content)
 *
 * Usage:
 * ```tsx
 * <Route element={
 *   <AdminGuard>
 *     <AdminLayout />
 *   </AdminGuard>
 * }>
 *   <Route path="/dashboard" element={<Dashboard />} />
 * </Route>
 * ```
 */

import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth();
  const location = useLocation();

  // Show loading while checking authentication status
  if (status === "idle" || status === "loading") {
    return (
      <div className="h-svh grid place-items-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  // Preserves the attempted path so user can return after login
  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}
