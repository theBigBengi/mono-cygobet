import type { RefreshResult } from "./refresh.types";
import * as authStorage from "./auth.storage";

type Handlers = {
  setAccessToken: (t: string | null) => void;
  setUser: (u: any) => void;
  setStatus: (s: import("./auth.types").AuthStatus) => void;
  accessTokenRef: { current: string | null };
};

/**
 * Centralized mapping of refresh outcomes -> auth state transitions.
 *
 * Rules (preserve existing behavior):
 * - ok: do nothing (access token already updated by caller)
 * - unauthorized: clear refresh token, clear access token and user, set unauthenticated
 * - network/unknown: if refresh token exists -> clear access token & user, set degraded; else set unauthenticated
 *
 * Returns true if handled (i.e., transition applied), false if no action taken.
 */
export async function handleRefreshResult(result: RefreshResult, handlers: Handlers) {
  if (result.ok) return false;

  const { setAccessToken, setUser, setStatus, accessTokenRef } = handlers;

  if (result.reason === "unauthorized") {
    await authStorage.clearRefreshToken();
    setAccessToken(null);
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    return true;
  }

  if (result.reason === "network" || result.reason === "unknown") {
    const refreshToken = await authStorage.getRefreshToken();
    if (refreshToken) {
      // Keep refresh token, but clear access token and set degraded
      setAccessToken(null);
      accessTokenRef.current = null;
      setUser(null);
      setStatus("degraded");
      return true;
    }

    // No refresh token -> cannot recover, mark unauthenticated
    setAccessToken(null);
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    return true;
  }

  if (result.reason === "no_refresh_token") {
    setStatus("unauthenticated");
    return true;
  }

  return false;
}

export default handleRefreshResult;

