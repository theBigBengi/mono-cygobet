// Small helpers for interpreting ApiError instances inside hooks and screens.
// Centralizing these avoids re-implementing status/code checks everywhere.
import { ApiError } from "../http/apiError";

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 0;
}

export function isNoAccessTokenError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "NO_ACCESS_TOKEN";
}

export function isOnboardingRequiredError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code === "ONBOARDING_REQUIRED"
  );
}
