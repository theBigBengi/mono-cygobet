// lib/auth/AuthProvider.tsx
// Central auth state for the mobile app.
// - Owns: auth status, current user, access token and auth errors.
// - Wires auth behavior into the HTTP client (refresh, logout, getAccessToken).
// - Does NOT own domain data (profiles, feeds, etc.) – those live in React Query.
import React, { createContext, useCallback, useEffect, useState } from "react";
import i18n from "i18next";
import type { ReactNode } from "react";
import {
  setRefreshCallback,
  setLogoutCallback,
  setGetAccessTokenCallback,
} from "../http/apiClient";
import { ApiError } from "../http/apiError";
import { analytics } from "../analytics";
import * as authApi from "./auth.api";
import * as authStorage from "./auth.storage";
import { getTokenExpiry } from "./auth.utils";
import * as netinfo from "@/lib/connectivity/netinfo";
import { handleRefreshResult } from "./refreshResultHandler";
import { AppState, AppStateStatus, Platform } from "react-native";
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
  applyAuthResult: (response: import("./auth.types").AuthSuccessResponse) => Promise<void>;
}

// Internal React context; components must use useAuth() helper instead of this.
const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("idle");
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
        // Web: refresh token is in HttpOnly cookie; no token in storage
        if (!refreshToken && Platform.OS !== "web") {
          return { ok: false, reason: "no_refresh_token" };
        }

        const response = await authApi.refresh(refreshToken ?? null);

        // Store new refresh token (rotation) — native only; web uses cookie
        if (Platform.OS !== "web") {
          await authStorage.setRefreshToken(response.refreshToken);
        }

        // Update access token in memory and ref
        setAccessToken(response.accessToken);
        accessTokenRef.current = response.accessToken;

        return { ok: true, accessToken: response.accessToken };
      } catch (err) {
        if (__DEV__) console.error("Failed to refresh access token:", err);

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
      setStatus("restoring");
      setError(null);

      if (__DEV__) console.log("Bootstrap: checking for refresh token");
      const refreshToken = await authStorage.getRefreshToken();
      if (__DEV__) console.log("Bootstrap: refreshToken exists:", !!refreshToken);
      if (!refreshToken) {
        if (__DEV__) console.log("Bootstrap: no refresh token, setting status to unauthenticated");
        setStatus("unauthenticated");
        return;
      }

      // First refresh attempt
      if (__DEV__) console.log("Bootstrap: calling refreshAccessToken (attempt 1)");
      let refreshResult = await refreshAccessToken();
      console.log(
        "Bootstrap: refreshResult:",
        refreshResult.ok ? "ok" : `failed: ${refreshResult.reason}`
      );

      // If refresh failed → check reason and handle accordingly
      if (!refreshResult.ok) {
        const reason = refreshResult.reason;

        // Auth error (401, forbidden) → immediate unauthenticated (no retry)
        if (reason === "unauthorized") {
          if (__DEV__) console.log("Bootstrap: auth error, clearing tokens and setting status to unauthenticated");
          await authStorage.clearRefreshToken();
          setAccessToken(null);
          accessTokenRef.current = null;
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        // Infrastructure error (network, timeout, transaction) → retry once
        // Do NOT clear tokens on infrastructure failures
        if (reason === "network" || reason === "unknown") {
          console.log(`Bootstrap: infrastructure error (${reason}), waiting before retry`);
          // Short delay before retry (1 second)
          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (__DEV__) console.log("Bootstrap: calling refreshAccessToken (attempt 2 - final)");
          const retryResult = await refreshAccessToken();
          console.log(
            "Bootstrap: retry refreshResult:",
            retryResult.ok ? "ok" : `failed: ${retryResult.reason}`
          );

          if (!retryResult.ok) {
            // Check if retry also failed with auth error (shouldn't happen, but handle safely)
            if (retryResult.reason === "unauthorized") {
              if (__DEV__) console.log("Bootstrap: retry failed with auth error, clearing tokens and setting status to unauthenticated");
              await authStorage.clearRefreshToken();
              setAccessToken(null);
              accessTokenRef.current = null;
              setUser(null);
              setStatus("unauthenticated");
              return;
            }

            // Infrastructure failure after retry → mark degraded (keep refresh token)
            if (__DEV__) console.log("Bootstrap: retry failed with infrastructure error, keeping tokens and setting status to degraded");
            setAccessToken(null);
            accessTokenRef.current = null;
            setUser(null);
            setStatus("degraded");
            return;
          }

          // Retry succeeded → use the result
          refreshResult = retryResult;
        }

        // no_refresh_token → unauthenticated (should not happen at this point, but handle safely)
        if (reason === "no_refresh_token") {
          if (__DEV__) console.log("Bootstrap: no refresh token, setting status to unauthenticated");
          setStatus("unauthenticated");
          return;
        }
      }

      // Refresh succeeded → set access token and attempt to load user
      if (!refreshResult.ok) return;
      setAccessToken(refreshResult.accessToken);
      accessTokenRef.current = refreshResult.accessToken;
      if (__DEV__) console.log("Bootstrap: refresh succeeded, attempting to load user");

      try {
        const userData = await authApi.me();
        setUser(userData);
        setError(null);
        analytics.identify(userData.id, accessTokenRef.current);
        if (userData.onboardingRequired) {
          setStatus("onboarding");
          if (__DEV__) console.log("Bootstrap: user requires onboarding, status set to onboarding");
          return;
        }
        setStatus("authenticated");
        if (__DEV__) console.log("Bootstrap: user loaded, status set to authenticated");
      } catch (meErr) {
        if (__DEV__) console.error("Bootstrap: failed to load user after refresh:", meErr);
        // Auth error -> clear tokens and mark unauthenticated
        if (meErr instanceof ApiError && meErr.status === 401 && meErr.code !== "NO_ACCESS_TOKEN") {
          if (__DEV__) console.log("Bootstrap: auth error loading user, clearing tokens and setting status to unauthenticated");
          await authStorage.clearRefreshToken();
          setAccessToken(null);
          accessTokenRef.current = null;
          setUser(null);
          setStatus("unauthenticated");
          setError(null);
          return;
        }

        // Infrastructure failure -> degraded
        if (__DEV__) console.log("Bootstrap: infrastructure error loading user, setting status to degraded");
        setUser(null);
        setStatus("degraded");
        setError(null);
        return;
      }
    } catch (err) {
      if (__DEV__) console.error("Bootstrap failed:", err);
      if (__DEV__) console.error("Bootstrap error details:", {
        isApiError: err instanceof ApiError,
        status: err instanceof ApiError ? err.status : "unknown",
        code: err instanceof ApiError ? err.code : "unknown",
        message: err instanceof Error ? err.message : String(err),
      });

      // Unexpected errors:
      // - If it's an auth error -> clear tokens and mark unauthenticated
      if (err instanceof ApiError && err.status === 401) {
        if (__DEV__) console.log("Bootstrap: unexpected auth error in catch, clearing tokens and setting status to unauthenticated");
        await authStorage.clearRefreshToken();
        setAccessToken(null);
        accessTokenRef.current = null;
        setUser(null);
        setStatus("unauthenticated");
        setError(null);
        return;
      }

      // Infrastructure/unexpected error -> degraded (keep refresh token)
      if (__DEV__) console.log("Bootstrap: unexpected error (infrastructure), keeping tokens and setting status to degraded");
      setAccessToken(null);
      accessTokenRef.current = null;
      setUser(null);
      setStatus("degraded");
      setError(null);
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
    try {
      if (__DEV__) console.log("LoadUser: calling /auth/me");
      const userData = await authApi.me();
      if (__DEV__) console.log("LoadUser: /auth/me succeeded, userData:", userData ? "received" : "null");
      setUser(userData);
      setError(null);
      if (userData.onboardingRequired) {
        setStatus("onboarding");
        return;
      }
      setStatus("authenticated");
    } catch (err) {
      if (__DEV__) console.error("LoadUser: /auth/me failed:", err);
      console.error("LoadUser error details:", {
        isApiError: err instanceof ApiError,
        status: err instanceof ApiError ? err.status : "unknown",
        code: err instanceof ApiError ? err.code : "unknown",
        message: err instanceof Error ? err.message : String(err),
      });

      // Only clear tokens on true auth failures (401 without NO_ACCESS_TOKEN code)
      if (err instanceof ApiError && err.status === 401 && err.code !== "NO_ACCESS_TOKEN") {
        if (__DEV__) console.log("LoadUser: true auth error (401 without NO_ACCESS_TOKEN), clearing tokens and setting status to unauthenticated");
        await authStorage.clearRefreshToken();
        setAccessToken(null);
        accessTokenRef.current = null;
        setUser(null);
        setStatus("unauthenticated");
        setError(null);
        return;
      }

      // Infrastructure/network/NO_ACCESS_TOKEN errors -> degraded if refresh token exists, else unauthenticated
      const refreshToken = await authStorage.getRefreshToken();
      if (refreshToken) {
        if (__DEV__) console.log("LoadUser: infrastructure error and refresh token present, setting status to degraded");
        setUser(null);
        setStatus("degraded");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user data due to network. Retry when connection is available."
        );
        return;
      }

      if (__DEV__) console.log("LoadUser: infrastructure error and no refresh token, setting status to unauthenticated");
      setUser(null);
      setStatus("unauthenticated");
      setError(
        err instanceof Error
          ? err.message
          : i18n.t("errors.somethingWentWrong")
      );
    }
  }, []);

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
      setStatus("unauthenticated");
      setError(null);
      analytics.reset();

      // Clear only user-scoped cached server data on explicit logout.
      // Queries that set meta: { scope: "user" } will be removed.
      queryClient.removeQueries({
        predicate: (query) => query.meta?.scope === "user",
      });
    }
  }, []);

  /**
   * Apply auth result (from register/login/google) directly into provider state
   * without making additional network requests. Used by sign-up flow to avoid
   * calling login() after register (which would double-roundtrip).
   */
  const applyAuthResult = useCallback(
    async (response: import("./auth.types").AuthSuccessResponse) => {
      try {
        setError(null);

        // Persist refresh token — native only; web uses HttpOnly cookie
        if (Platform.OS !== "web") {
          await authStorage.setRefreshToken(response.refreshToken);
        }

        // Set access token in memory and ref ref for HTTP client
        setAccessToken(response.accessToken);
        accessTokenRef.current = response.accessToken;

        // Map returned minimal user shape into domain user (server /auth/register
        // returns id,email,username,name,image but not role/onboarding flags).
        const userData = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          name: response.user.name,
          image: response.user.image,
          role: "user", // default role for newly registered users
          onboardingRequired:
            !response.user.username || response.user.username.trim().length === 0,
        } as any;

        setUser(userData);
        analytics.identify(userData.id, response.accessToken);
        analytics.track("user_signed_up");
        // Set explicit onboarding/authenticated state
        if (userData.onboardingRequired) {
          setStatus("onboarding");
        } else {
          setStatus("authenticated");
        }
      } catch (err) {
        if (__DEV__) console.error("applyAuthResult failed:", err);
        throw err;
      }
    },
    []
  );

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

        // Store refresh token — native only; web uses HttpOnly cookie
        if (Platform.OS !== "web") {
          await authStorage.setRefreshToken(response.refreshToken);
        }

        // Set access token (so me() can use it via callback)
        setAccessToken(response.accessToken);
        accessTokenRef.current = response.accessToken;

        // Fetch user data once (includes role and all user info)
        // me() will automatically use the access token via callback
        try {
          const userData = await authApi.me();
          setUser(userData);
          analytics.identify(userData.id, accessTokenRef.current);
          analytics.track("user_logged_in");
          if (userData.onboardingRequired) {
            setStatus("onboarding");
          } else {
            setStatus("authenticated");
          }
        } catch (meError) {
          // Handle /auth/me failure separately
          // Network error: degraded if refresh token exists, else unauthenticated
          if (meError instanceof ApiError && meError.status === 0) {
            const refreshToken = await authStorage.getRefreshToken();
            if (refreshToken) {
              setUser(null);
              setStatus("degraded");
              setError("Connected but unable to load user data. Please try again.");
              return;
            }
            setUser(null);
            setStatus("unauthenticated");
            setError("Connected but unable to load user data. Please try again.");
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
                if (userData.onboardingRequired) {
                  setStatus("onboarding");
                } else {
                  setStatus("authenticated");
                }
                return;
              } catch {
                // Still failing after refresh, logout
                await logout();
                throw new Error(i18n.t("errors.auth"));
              }
            } else {
              // Refresh failed (auth failure), logout
              await logout();
              throw new Error(i18n.t("errors.auth"));
            }
          }

          // Other errors, throw as-is
          throw meError;
        }
      } catch (err) {
        // Login request itself failed
        const errorMessage =
          err instanceof Error ? err.message : i18n.t("auth.loginFailed");
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

  /**
   * Proactive refresh scheduler:
   * - Watches accessToken and schedules a silent refresh ~2 minutes before expiry.
   * - Uses single-flight refreshAccessToken().
   * - On success: update accessToken (already done by refreshAccessToken).
   * - On failure: map to existing rules (unauthorized -> unauthenticated, network/unknown -> degraded if refresh token exists).
   */
  const proactiveTimerRef = React.useRef<number | null>(null);
  const scheduleProactiveRefresh = React.useCallback(
    (token: string | null) => {
      // Clear previous timer
      if (proactiveTimerRef.current) {
        try {
          clearTimeout(proactiveTimerRef.current);
        } catch {}
        proactiveTimerRef.current = null;
      }

      const expiry = getTokenExpiry(token);
      if (!expiry) return;

      const now = Date.now();
      const TWO_MIN = 2 * 60 * 1000;
      const msUntilRefresh = expiry - now - TWO_MIN;

      // If it's already within the window, refresh immediately (silent)
      if (msUntilRefresh <= 0) {
        (async () => {
          try {
            const result = await refreshAccessToken();
            await handleRefreshResult(result, {
              setAccessToken,
              setUser,
              setStatus,
              accessTokenRef,
            });
          } catch {
            // Ignore - handled by helper
          }
        })();
        return;
      }

      // Schedule timer
      try {
        // use window.setTimeout vs global for RN compatibility
        proactiveTimerRef.current = (setTimeout(async () => {
          try {
            const result = await refreshAccessToken();
            await handleRefreshResult(result, {
              setAccessToken,
              setUser,
              setStatus,
              accessTokenRef,
            });
          } catch {
            // noop
          }
        }, Math.max(0, msUntilRefresh)) as unknown) as number;
      } catch {
        // ignore scheduling errors
      }
    },
    [refreshAccessToken]
  );

  // Watch accessToken changes to (re)schedule proactive refresh
  useEffect(() => {
    scheduleProactiveRefresh(accessToken);
    return () => {
      if (proactiveTimerRef.current) {
        try {
          clearTimeout(proactiveTimerRef.current);
        } catch {}
        proactiveTimerRef.current = null;
      }
    };
  }, [accessToken, scheduleProactiveRefresh]);

  /**
   * AppState listener to refresh silently on resume if needed.
   */
  const lastAppStateRef = React.useRef<AppStateStatus | null>(null);
  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = lastAppStateRef.current;
      lastAppStateRef.current = next;
      if (prev !== "active" && next === "active") {
        // App resumed
        (async () => {
          try {
            if (status === "authenticated") {
              const expiry = getTokenExpiry(accessToken);
              const now = Date.now();
              // small skew of 10s
                if (!expiry || expiry <= now + 10_000) {
                const result = await refreshAccessToken();
                await handleRefreshResult(result, {
                  setAccessToken,
                  setUser,
                  setStatus,
                  accessTokenRef,
                });
              }
            }
          } catch {
            // ignore
          }
        })();
      }
    };

    lastAppStateRef.current = AppState.currentState;
    const sub = AppState.addEventListener ? AppState.addEventListener("change", handleAppStateChange) : null;
    return () => {
      try {
        if (sub && typeof sub.remove === "function") sub.remove();
      } catch {}
    };
  }, [status, accessToken, refreshAccessToken]);

  /**
   * Connectivity subscription: when connection returns while in degraded, attempt recovery.
   */
  useEffect(() => {
    let wasOnline = netinfo.isOnlineSync();
    const unsub = netinfo.subscribe(async (online) => {
      // Only act on offline -> online transitions
        if (!wasOnline && online) {
        try {
          const refreshToken = await authStorage.getRefreshToken();
          // Web: refresh token is in cookie; proceed without stored token
          if (!refreshToken && Platform.OS !== "web") {
            // nothing to recover
            wasOnline = online;
            return;
          }

          if (status === "degraded") {
            const refreshResult = await refreshAccessToken();
            const handled = await handleRefreshResult(refreshResult, {
              setAccessToken,
              setUser,
              setStatus,
              accessTokenRef,
            });
            if (handled) {
              // handled by mapping (unauthenticated/degraded)
              wasOnline = online;
              return;
            }

            // Refresh ok - attempt to load user
            if (!refreshResult.ok) {
              wasOnline = online;
              return;
            }
            try {
              setAccessToken(refreshResult.accessToken);
              accessTokenRef.current = refreshResult.accessToken;
              const userData = await authApi.me();
              setUser(userData);
              setError(null);
              if (userData.onboardingRequired) {
                setStatus("onboarding");
              } else {
                setStatus("authenticated");
              }
            } catch (meErr) {
              if (meErr instanceof ApiError && meErr.status === 401 && meErr.code !== "NO_ACCESS_TOKEN") {
                await authStorage.clearRefreshToken();
                setAccessToken(null);
                accessTokenRef.current = null;
                setUser(null);
                setStatus("unauthenticated");
              } else {
                // keep degraded
              }
            }
          }
        } catch {
          // ignore
        }
      }
      wasOnline = online;
    });

    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [status, refreshAccessToken]);

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
    applyAuthResult,
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
