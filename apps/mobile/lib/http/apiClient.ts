// lib/http/apiClient.ts
import { getApiBaseUrl } from "../env";
import { ApiError } from "./apiError";
import type { RefreshResult } from "../auth/refresh.types";

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  accessToken?: string | null;
};

type RefreshCallback = () => Promise<RefreshResult>;
type LogoutCallback = () => Promise<void>;
type GetAccessTokenCallback = () => string | null;

let refreshCallback: RefreshCallback | null = null;
let logoutCallback: LogoutCallback | null = null;
let getAccessTokenCallback: GetAccessTokenCallback | null = null;

/**
 * Set the refresh callback for token refresh on 401
 */
export function setRefreshCallback(callback: RefreshCallback): void {
  refreshCallback = callback;
}

/**
 * Set the logout callback for automatic logout on auth failure
 */
export function setLogoutCallback(callback: LogoutCallback): void {
  logoutCallback = callback;
}

/**
 * Set the get access token callback for automatic token injection
 */
export function setGetAccessTokenCallback(
  callback: GetAccessTokenCallback
): void {
  getAccessTokenCallback = callback;
}

/**
 * Base API fetch function
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", headers = {}, body, accessToken } = options;

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...headers,
  };

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    // Network errors (server not running, CORS, etc.)
    if (
      error instanceof TypeError &&
      error.message === "Network request failed"
    ) {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Unable to connect to server. Make sure the server is running and accessible.",
        { originalError: error.message, url }
      );
    }
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  let responseBody: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, responseBody);
  }

  return responseBody as T;
}

/**
 * API fetch with automatic token refresh on 401
 * Retries the original request once after refresh
 *
 * Precedence rule:
 * 1. Determine token: options.accessToken ?? getAccessTokenCallback?.()
 * 2. Call request
 * 3. On 401 → call refresh callback (single-flight) → retry with the new access token
 * 4. If retry fails → logout callback → throw the retry error
 */
export async function apiFetchWithAuthRetry<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { accessToken: providedToken, ...restOptions } = options;

  // Step 1: Determine token (provided token takes precedence over callback)
  const accessToken =
    providedToken ?? (getAccessTokenCallback ? getAccessTokenCallback() : null);

  // Step 1.5: Fail fast if no access token available
  // Prevents unnecessary 401 → refresh → logout cycle when token simply missing
  // This error should be caught by caller (e.g., bootstrap) to handle gracefully
  if (!accessToken) {
    throw new ApiError(
      401,
      "NO_ACCESS_TOKEN",
      "Auth not ready yet. Please retry."
    );
  }

  // Step 2: Call request
  try {
    return await apiFetch<T>(path, { ...restOptions, accessToken });
  } catch (error) {
    // Step 3: Only retry on 401 Unauthorized (but not NO_ACCESS_TOKEN)
    // NO_ACCESS_TOKEN means token is missing, not expired - let caller handle it
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      error.code !== "NO_ACCESS_TOKEN"
    ) {
      if (!refreshCallback) {
        // No refresh mechanism available, logout if possible
        if (logoutCallback) {
          await logoutCallback();
        }
        throw error;
      }

      // Attempt to refresh token (single-flight is handled in refresh callback)
      const refreshResult = await refreshCallback();

      if (!refreshResult.ok) {
        // Only logout on definite auth failure (invalid/revoked/missing token)
        // Network/unknown errors should preserve tokens for retry
        if (
          refreshResult.reason === "unauthorized" ||
          refreshResult.reason === "no_refresh_token"
        ) {
          if (logoutCallback) {
            await logoutCallback();
          }
        }
        // Network/unknown: keep tokens, bubble the error to caller/UI
        throw error;
      }

      // Step 4: Retry original request with new token
      try {
        return await apiFetch<T>(path, {
          ...restOptions,
          accessToken: refreshResult.accessToken,
        });
      } catch (retryError) {
        // Retry failed (could be 401 again or different error)
        // Logout and throw the retry error (not the original 401)
        if (logoutCallback) {
          await logoutCallback();
        }
        throw retryError;
      }
    }

    // Non-401 error, throw as-is
    throw error;
  }
}
