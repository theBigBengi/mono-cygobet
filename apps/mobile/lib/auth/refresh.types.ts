/**
 * Refresh token operation result type
 * Used to distinguish between auth failures and network errors
 */
export type RefreshResult =
  | { ok: true; accessToken: string }
  | {
      ok: false;
      reason: "no_refresh_token" | "unauthorized" | "network" | "unknown";
    };

