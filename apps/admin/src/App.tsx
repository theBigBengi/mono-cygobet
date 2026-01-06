/**
 * Main App Component
 *
 * Initializes authentication on app startup and renders routes.
 *
 * Flow:
 * 1. On mount → calls bootstrap() to check if user has valid session cookie
 * 2. bootstrap() → calls /admin/auth/me → sets auth state
 * 3. Routes are rendered → AdminGuard protects routes based on auth state
 *
 * The bootstrap check happens once on app load, before any routes are rendered.
 * This ensures we know the auth state before showing protected content.
 */

import * as React from "react";
import { useRoutes } from "react-router-dom";
import { useAdminAuth } from "@/auth";
import { routes } from "@/config/routes";

function App() {
  const { bootstrap } = useAdminAuth();

  // Check authentication status on app startup
  // This validates the httpOnly cookie and sets initial auth state
  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return useRoutes(routes);
}

export default App;
