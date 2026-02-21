/**
 * Admin Authentication Context & Hook
 *
 * Provides global authentication state management for the admin app.
 *
 * Authentication State Machine:
 * - "idle" → Initial state, before bootstrap runs
 * - "loading" → Auth check in progress (bootstrap or login)
 * - "authed" → User is authenticated, has valid session
 * - "guest" → User is not authenticated (no session or expired)
 *
 * Flow:
 * 1. App starts → bootstrap() called → checks /admin/auth/me
 * 2. If valid cookie → status: "authed", me: user data
 * 3. If no/invalid cookie → status: "guest", me: null
 * 4. Login → calls login() → sets cookie → bootstrap() → "authed"
 * 5. Logout → calls logout() → clears cookie → status: "guest"
 */

import * as React from "react";
import type { AdminMeResponse } from "@repo/types/http/admin";
import { AdminApiError } from "@/lib/adminApi";
import * as adminAuth from "./adminAuth";
import SessionExpiredModal from "@/components/SessionExpiredModal";
import { useNavigate } from "react-router-dom";
import { queryClient } from "@/providers/query-provider";

/**
 * Authentication status states
 * - idle: Initial state before any auth check
 * - loading: Auth check in progress
 * - authed: User is authenticated with valid session
 * - guest: User is not authenticated
 */
export type AdminAuthStatus = "idle" | "loading" | "authed" | "guest";

/**
 * Authentication state interface
 */
export interface AdminAuthState {
  /** Current authentication status */
  status: AdminAuthStatus;
  /** Current user data (null if not authenticated) */
  me: AdminMeResponse["data"] | null;
  /** Error message if auth operation failed */
  error: string | null;
}

/**
 * Authentication actions interface
 */
export interface AdminAuthActions {
  /** Check current authentication status by calling /admin/auth/me */
  bootstrap: () => Promise<void>;
  /** Login with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Logout and clear session */
  logout: () => Promise<void>;
}

/**
 * Combined context value type (state + actions)
 */
export type AdminAuthContextValue = AdminAuthState & AdminAuthActions;

/**
 * React context for admin authentication
 * Provides auth state and actions to all child components
 */
const AdminAuthContext = React.createContext<AdminAuthContextValue | null>(
  null
);

/**
 * Admin Authentication Provider Component
 *
 * Wraps the app and provides authentication context to all children.
 * Manages global auth state and provides actions for login/logout/bootstrap.
 *
 * Usage:
 * ```tsx
 * <AdminAuthProvider>
 *   <App />
 * </AdminAuthProvider>
 * ```
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AdminAuthStatus>("idle");
  const statusRef = React.useRef(status);
  statusRef.current = status;
  const [me, setMe] = React.useState<AdminMeResponse["data"] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = React.useState(false);
  const navigate = useNavigate();

  /**
   * Bootstrap authentication check
   *
   * Called on app startup to check if user has a valid session cookie.
   * Flow:
   * 1. Sets status to "loading"
   * 2. Calls /admin/auth/me to validate cookie
   * 3. If valid → status: "authed", sets user data
   * 4. If 401/403 → status: "guest" (no error, just not authenticated)
   * 5. If other error → status: "guest", sets error message
   */
  const bootstrap = React.useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await adminAuth.me();
      setMe(res.data);
      setStatus("authed");
    } catch (err: unknown) {
      // 401/403 are expected when not authenticated - don't treat as error
      if (
        err instanceof AdminApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        setMe(null);
        setStatus("guest");
        return;
      }

      // Other errors (network, server error, etc.) are actual errors
      setMe(null);
      setStatus("guest");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  /**
   * Login with email and password
   *
   * Flow:
   * 1. Sets status to "loading"
   * 2. Calls /admin/auth/login → server sets httpOnly cookie
   * 3. Calls bootstrap() to fetch user data with new cookie
   * 4. On success → status: "authed", user data set
   * 5. On failure → status: "guest", error set, throws error
   *
   * @throws {AdminApiError} If login fails (invalid credentials, etc.)
   */
  const login = React.useCallback(
    async (email: string, password: string) => {
      setStatus("loading");
      setError(null);
      try {
        // Login sets the httpOnly cookie
        await adminAuth.login(email, password);
        // Bootstrap fetches user data using the new cookie
        await bootstrap();
      } catch (err: unknown) {
        setMe(null);
        setStatus("guest");
        setError(err instanceof Error ? err.message : "Unknown error");
        // Re-throw so login page can handle it
        throw err;
      }
    },
    [bootstrap]
  );

  /**
   * Logout current user
   *
   * Flow:
   * 1. Calls /admin/auth/logout → server clears cookie
   * 2. Always sets status to "guest" and clears user data
   * 3. Even if API call fails, we clear local state
   */
  const logout = React.useCallback(async () => {
    setError(null);
    try {
      await adminAuth.logout();
    } finally {
      // Always clear local state, even if logout API call fails
      setMe(null);
      setStatus("guest");
    }
  }, []);

  // Listen for global session-expired events dispatched by adminFetch.
  React.useEffect(() => {
    function onExpired() {
      // Only show the modal when there was an active session.
      // A 401 while already guest/idle is not a "session expired" scenario.
      if (statusRef.current !== "authed") return;

      // Immediately mark as guest and wipe all cached server data so stale
      // UI cannot mislead the user into thinking actions succeed.
      setMe(null);
      setStatus("guest");
      queryClient.cancelQueries();
      queryClient.clear();
      setShowSessionExpiredModal(true);
    }
    window.addEventListener("admin-session-expired", onExpired as EventListener);
    return () => {
      window.removeEventListener("admin-session-expired", onExpired as EventListener);
    };
  }, []);

  async function handleExpiredConfirm() {
    setShowSessionExpiredModal(false);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  // Memoize context value to prevent unnecessary re-renders
  const value = React.useMemo<AdminAuthContextValue>(
    () => ({ status, me, error, bootstrap, login, logout }),
    [status, me, error, bootstrap, login, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal open={showSessionExpiredModal} onConfirm={handleExpiredConfirm} />
    </AdminAuthContext.Provider>
  );
}

/**
 * Hook to access admin authentication state and actions
 *
 * Must be used within an AdminAuthProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, me, login, logout } = useAdminAuth();
 *
 *   if (status === "loading") return <Spinner />;
 *   if (status === "guest") return <LoginForm />;
 *
 *   return <div>Hello {me?.name}</div>;
 * }
 * ```
 *
 * @throws {Error} If used outside AdminAuthProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth(): AdminAuthContextValue {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within <AdminAuthProvider />");
  }
  return ctx;
}
