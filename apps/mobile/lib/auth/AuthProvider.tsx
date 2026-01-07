// lib/auth/AuthProvider.tsx
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

interface AuthContextValue extends AuthState {
  bootstrap: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<RefreshResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Single-flight refresh lock to prevent concurrent refresh calls
  const refreshPromiseRef = React.useRef<Promise<RefreshResult> | null>(null);

  // Ref to store latest access token (prevents stale closure in callback)
  const accessTokenRef = React.useRef<string | null>(null);

  /**
   * Refresh access token using stored refresh token
   * Uses single-flight pattern to prevent concurrent refresh calls
   * Returns rich result to distinguish between auth failures and network errors
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
   * Bootstrap: check for existing session on app start
   */
  const bootstrap = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);

      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) {
        setStatus("guest");
        return;
      }

      // Refresh access token
      const refreshResult = await refreshAccessToken();
      if (!refreshResult.ok) {
        // Auth failure: clear tokens and go to guest
        if (
          refreshResult.reason === "unauthorized" ||
          refreshResult.reason === "no_refresh_token"
        ) {
          setStatus("guest");
          return;
        }

        // Network or unknown error: keep tokens, show loading with error
        // User can retry when network is available
        setError(
          "Cannot reach server. Please check your connection and try again."
        );
        setStatus("loading"); // Keep loading state, allow retry
        return;
      }

      // Set access token before fetching user info (so me() can use it)
      setAccessToken(refreshResult.accessToken);
      accessTokenRef.current = refreshResult.accessToken;

      // Fetch user info (me() will automatically use the access token via callback)
      const userData = await authApi.me();
      setUser(userData);
      setStatus("authed");
    } catch (err) {
      console.error("Bootstrap failed:", err);

      // Only clear tokens on 401 (auth failure), but not NO_ACCESS_TOKEN
      // NO_ACCESS_TOKEN means token is missing (timing issue), not expired
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        err.code !== "NO_ACCESS_TOKEN"
      ) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize auth"
        );
        setStatus("guest");
        await authStorage.clearRefreshToken();
        setAccessToken(null);
        accessTokenRef.current = null;
        setUser(null);
      } else {
        // Network error, NO_ACCESS_TOKEN, or other error - keep tokens, show loading with error
        // User can retry later when network is available or token is set
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect. Please check your connection and try again."
        );
        setStatus("loading"); // Keep loading state, allow retry
        // Tokens remain stored for retry
      }
    }
  }, [refreshAccessToken]);

  /**
   * Logout: clear tokens and user data
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
    }
  }, []);

  /**
   * Login with email/username and password
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

  // Set refresh and logout callbacks for API client
  // Use ref for access token callback to avoid stale closure
  useEffect(() => {
    setRefreshCallback(refreshAccessToken);
    setLogoutCallback(logout);
    setGetAccessTokenCallback(() => accessTokenRef.current);
  }, [refreshAccessToken, logout]);

  // Bootstrap on mount
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const value: AuthContextValue = {
    status,
    user,
    accessToken,
    error,
    bootstrap,
    login,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
