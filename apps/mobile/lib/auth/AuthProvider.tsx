// lib/auth/AuthProvider.tsx
// Central auth state for the mobile app.
// - Owns: auth status, current user, access token and auth errors.
// - Wires auth behavior into the HTTP client (refresh, logout, getAccessToken).
// - Does NOT own domain data (profiles, feeds, etc.) – those live in React Query.
import React, { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  setRefreshCallback,
  setLogoutCallback,
  setGetAccessTokenCallback,
} from "../http/apiClient";
import { ApiError } from "../http/apiError";
import * as authApi from "./auth.api";
import * as authStorage from "./auth.storage";
import type { AuthState, AuthStatus, User } from "./auth.types";
import type { RefreshResult } from "./refresh.types";
import { queryClient } from "../query/queryClient";

// Public shape of the auth context exposed via useAuth().
export interface AuthContextValue extends AuthState {
  bootstrap: () => Promise<void>;
  loadUser: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<RefreshResult>;
}

// Internal React context; components must use useAuth() helper instead of this.
const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Single-flight refresh lock to prevent concurrent refresh calls.
  // This guarantees only one /auth/refresh is in flight at a time.
  const refreshPromiseRef = React.useRef<Promise<RefreshResult> | null>(null);

  // Ref to store latest access token (prevents stale closure in callback).
  // apiClient reads from this via getAccessTokenCallback.
  const accessTokenRef = React.useRef<string | null>(null);

  /**
   * Refresh access token using stored refresh token.
   *
   * Responsibilities:
   * - Enforce single-flight behavior (shared promise).
   * - Differentiate between:
   *   - "unauthorized" (401) → clear tokens.
   *   - "network"/"unknown" → keep tokens and allow retry.
   *   - "no_refresh_token" → nothing to do (guest).
   */
  const refreshAccessToken = useCallback(async (): Promise<RefreshResult> => {
    // If a refresh is already in progress, return that promise
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Start new refresh
    refreshPromiseRef.current = (async (): Promise<RefreshResult> => {
      try {
        const refreshToken = await authStorage.getRefreshToken();
        if (!refreshToken) {
          return { ok: false, reason: "no_refresh_token" };
        }

        const response = await authApi.refresh(refreshToken);

        // Store new refresh token (rotation)
        await authStorage.setRefreshToken(response.refreshToken);

        // Update access token in memory and ref
        setAccessToken(response.accessToken);
        accessTokenRef.current = response.accessToken;

        return { ok: true, accessToken: response.accessToken };
      } catch (err) {
        console.error("Failed to refresh access token:", err);

        // Only clear tokens on 401 (auth failure)
        // Network errors should not clear tokens - allow retry
        if (err instanceof ApiError && err.status === 401) {
          await authStorage.clearRefreshToken();
          setAccessToken(null);
          accessTokenRef.current = null;
          return { ok: false, reason: "unauthorized" };
        }

        // Network error (status 0)
        if (err instanceof ApiError && err.status === 0) {
          return { ok: false, reason: "network" };
        }

        // Other errors
        return { ok: false, reason: "unknown" };
      } finally {
        // Clear the promise ref so next refresh can proceed
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  /**
   * Bootstrap: check for existing session on app start.
   *
   * Flow:
   * - If no refresh token → guest.
   * - If refresh succeeds → fetch /auth/me and move to "authed".
   * - If refresh fails with auth error (401, forbidden) → guest + clear tokens (no retry).
   * - If refresh fails with infrastructure error (network, timeout, transaction) → retry once, then guest if fails again.
   * - If /auth/me fails (any error) → guest + clear tokens.
   *
   * Critical:
   * - Retry only for infrastructure errors (network, timeout, transaction), not auth errors.
   * - Maximum one retry (total of two attempts).
   * - ALL failures MUST end loading state and go to guest.
   */
  const bootstrap = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);

      console.log("Bootstrap: checking for refresh token");
      const refreshToken = await authStorage.getRefreshToken();
      console.log("Bootstrap: refreshToken exists:", !!refreshToken);
      if (!refreshToken) {
        console.log("Bootstrap: no refresh token, setting status to guest");
        setStatus("guest");
        return;
      }

      // First refresh attempt
      console.log("Bootstrap: calling refreshAccessToken (attempt 1)");
      let refreshResult = await refreshAccessToken();
      console.log(
        "Bootstrap: refreshResult:",
        refreshResult.ok ? "ok" : `failed: ${refreshResult.reason}`
      );

      // If refresh failed → check reason and handle accordingly
      if (!refreshResult.ok) {
        const reason = refreshResult.reason;

        // Auth error (401, forbidden) → immediate guest (no retry)
        if (reason === "unauthorized") {
          console.log("Bootstrap: auth error, clearing tokens and setting status to guest");
          await authStorage.clearRefreshToken();
          setAccessToken(null);
          accessTokenRef.current = null;
          setUser(null);
          setStatus("guest");
          return;
        }

        // Infrastructure error (network, timeout, transaction) → retry once
        // CRITICAL: Do NOT clear tokens on infrastructure failures
        // Even if retry fails, keep status="authed" and allow later retry
        if (reason === "network" || reason === "unknown") {
          console.log(`Bootstrap: infrastructure error (${reason}), waiting before retry`);
          // Short delay before retry (1 second)
          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log("Bootstrap: calling refreshAccessToken (attempt 2 - final)");
          const retryResult = await refreshAccessToken();
          console.log(
            "Bootstrap: retry refreshResult:",
            retryResult.ok ? "ok" : `failed: ${retryResult.reason}`
          );

          // If retry also failed → keep tokens, set status="authed" with no access token
          // This allows UI to open and refresh can succeed later
          if (!retryResult.ok) {
            // Check if retry also failed with auth error (shouldn't happen, but handle safely)
            if (retryResult.reason === "unauthorized") {
              console.log("Bootstrap: retry failed with auth error, clearing tokens and setting status to guest");
              await authStorage.clearRefreshToken();
              setAccessToken(null);
              accessTokenRef.current = null;
              setUser(null);
              setStatus("guest");
              return;
            }

            // Infrastructure failure after retry → keep status="authed", no access token
            // Refresh token is NOT cleared - session is still valid
            console.log("Bootstrap: retry failed with infrastructure error, keeping tokens and setting status to authed (no access token)");
            setAccessToken(null);
            accessTokenRef.current = null;
            // user remains null (not loaded yet)
            setStatus("authed");
            console.log("Bootstrap: status set to authed despite refresh failure (infrastructure issue, not auth failure)");
            return;
          }

          // Retry succeeded → use the result
          refreshResult = retryResult;
        }

        // no_refresh_token → guest (should not happen at this point, but handle safely)
        if (reason === "no_refresh_token") {
          console.log("Bootstrap: no refresh token, setting status to guest");
          setStatus("guest");
          return;
        }
      }

      // Refresh succeeded → set access token and mark as authed
      // User data will be loaded separately via loadUser()
      setAccessToken(refreshResult.accessToken);
      accessTokenRef.current = refreshResult.accessToken;
      setStatus("authed");
      console.log("Bootstrap: refresh succeeded, set status to authed (user not loaded yet)");
    } catch (err) {
      console.error("Bootstrap failed:", err);
      console.error("Bootstrap error details:", {
        isApiError: err instanceof ApiError,
        status: err instanceof ApiError ? err.status : "unknown",
        code: err instanceof ApiError ? err.code : "unknown",
        message: err instanceof Error ? err.message : String(err),
      });

      // CRITICAL: Unexpected errors in bootstrap should NOT clear tokens
      // Only clear tokens if we can determine it's an auth failure
      // For infrastructure/unexpected errors, keep status="authed" to allow retry later
      if (err instanceof ApiError && err.status === 401) {
        console.log("Bootstrap: unexpected auth error in catch, clearing tokens and setting status to guest");
        await authStorage.clearRefreshToken();
        setAccessToken(null);
        accessTokenRef.current = null;
        setUser(null);
        setStatus("guest");
        setError(null);
        return;
      }

      // Infrastructure/unexpected error → keep status="authed", no access token
      // Refresh token is NOT cleared - session might still be valid
      console.log("Bootstrap: unexpected error (not auth), keeping tokens and setting status to authed (no access token)");
      setAccessToken(null);
      accessTokenRef.current = null;
      // user remains null (not loaded yet)
      setStatus("authed");
      setError(null);
      console.log("Bootstrap: status set to authed despite error (infrastructure issue, not auth failure)");
    }
  }, [refreshAccessToken]);

  /**
   * Load user data from /auth/me.
   *
   * This is a separate step after bootstrap determines auth state.
   * - Should be called only if status === "authed".
   * - Network errors: keep status="authed", user=null (soft-loading).
   * - Auth errors (401): clear tokens, status="guest".
   */
  const loadUser = useCallback(async () => {
    // Only load user if already authed (bootstrap succeeded)
    if (status !== "authed") {
      console.log("LoadUser: status is not authed, skipping");
      return;
    }

    try {
      console.log("LoadUser: calling /auth/me");
      const userData = await authApi.me();
      console.log("LoadUser: /auth/me succeeded, userData:", userData ? "received" : "null");
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error("LoadUser: /auth/me failed:", err);
      console.error("LoadUser error details:", {
        isApiError: err instanceof ApiError,
        status: err instanceof ApiError ? err.status : "unknown",
        code: err instanceof ApiError ? err.code : "unknown",
        message: err instanceof Error ? err.message : String(err),
      });

      // CRITICAL: Only clear tokens on true auth failures (401 without NO_ACCESS_TOKEN code)
      // 401 with "NO_ACCESS_TOKEN" means refresh failed (infrastructure), not auth failure
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        err.code !== "NO_ACCESS_TOKEN"
      ) {
        console.log("LoadUser: true auth error (401 without NO_ACCESS_TOKEN), clearing tokens and setting status to guest");
        await authStorage.clearRefreshToken();
        setAccessToken(null);
        accessTokenRef.current = null;
        setUser(null);
        setStatus("guest");
        setError(null);
        return;
      }

      // 401 with NO_ACCESS_TOKEN or network/other errors → keep status="authed", user=null
      // This means refresh failed (infrastructure) or network issue, not auth failure
      console.log("LoadUser: infrastructure/network error or NO_ACCESS_TOKEN, keeping status=authed, user=null");
      setUser(null);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load user data. Please check your connection and retry."
      );
    }
  }, [status]);

  /**
   * Logout: clear tokens, user data and user-scoped React Query cache.
   *
   * Notes:
   * - Makes a best-effort /auth/logout call if refresh token exists.
   * - Regardless of network outcome, local state is always reset to "guest".
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (refreshToken) {
        // Best-effort logout call
        try {
          await authApi.logout(refreshToken);
        } catch {
          // Ignore errors - best effort
        }
      }
    } catch {
      // Ignore errors
    } finally {
      // Always clear local state
      await authStorage.clearRefreshToken();
      setAccessToken(null);
      accessTokenRef.current = null;
      setUser(null);
      setStatus("guest");
      setError(null);

      // Clear only user-scoped cached server data on explicit logout.
      // Queries that set meta: { scope: "user" } will be removed.
      queryClient.removeQueries({
        predicate: (query) => query.meta?.scope === "user",
      });
    }
  }, []);

  /**
   * Login with email/username and password.
   *
   * Flow:
   * - Call /auth/login to receive tokens.
   * - Persist refresh token and store access token in memory.
   * - Call /auth/me once to populate User in context.
   * - On /auth/me network failure → status="authed", user=null (soft-loading).
   * - On /auth/me 401 → attempt single refresh and retry once, else logout.
   */
  const login = useCallback(
    async (emailOrUsername: string, password: string) => {
      try {
        setError(null);
        const response = await authApi.login(emailOrUsername, password);

        // Store refresh token
        await authStorage.setRefreshToken(response.refreshToken);

        // Set access token (so me() can use it via callback)
        setAccessToken(response.accessToken);
        accessTokenRef.current = response.accessToken;

        // Fetch user data once (includes role and all user info)
        // me() will automatically use the access token via callback
        try {
          const userData = await authApi.me();
          setUser(userData);
          setStatus("authed");
        } catch (meError) {
          // Handle /auth/me failure separately
          // Network error: keep tokens, set status to authed with null user
          if (meError instanceof ApiError && meError.status === 0) {
            setUser(null);
            setStatus("authed"); // User is authed, just no user data yet (network issue)
            setError(
              "Connected but unable to load user data. Please try again."
            );
            // Don't throw - allow user to retry /auth/me later
            return;
          }

          // 401 error: token pipeline issue, attempt refresh once
          if (meError instanceof ApiError && meError.status === 401) {
            const refreshResult = await refreshAccessToken();
            if (refreshResult.ok) {
              // Retry /auth/me with new token
              try {
                const userData = await authApi.me();
                setUser(userData);
                setStatus("authed");
                return;
              } catch {
                // Still failing after refresh, logout
                await logout();
                throw new Error("Authentication failed. Please log in again.");
              }
            } else {
              // Refresh failed (auth failure), logout
              await logout();
              throw new Error("Authentication failed. Please log in again.");
            }
          }

          // Other errors, throw as-is
          throw meError;
        }
      } catch (err) {
        // Login request itself failed
        const errorMessage =
          err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        throw err;
      }
    },
    [refreshAccessToken, logout]
  );

  // Set refresh and logout callbacks for the HTTP client.
  // Use ref for access token callback to avoid stale closure.
  useEffect(() => {
    setRefreshCallback(refreshAccessToken);
    setLogoutCallback(logout);
    setGetAccessTokenCallback(() => accessTokenRef.current);
  }, [refreshAccessToken, logout]);

  // Bootstrap on initial mount - DISABLED: AppStart orchestrator handles this
  // useEffect(() => {
  //   bootstrap();
  // }, [bootstrap]);

  const value: AuthContextValue = {
    status,
    user,
    accessToken,
    error,
    bootstrap,
    loadUser,
    login,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * - Throws if used outside AuthProvider so misconfiguration fails fast.
 */
export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
