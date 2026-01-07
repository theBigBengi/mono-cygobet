// lib/auth/authGuards.ts
// Centralized auth guard helpers used by layouts and data-fetching.
// Keeping these here avoids copy-pasted logic across features.
import type { AuthStatus, User } from "./auth.types";

// True when user can access fully-protected, onboarding-complete features.
export function isReadyForProtected(
  status: AuthStatus,
  user: User | null
): boolean {
  return status === "authed" && !!user && user.onboardingRequired === false;
}

// True when user is logged in but still must complete onboarding.
export function isReadyForOnboarding(
  status: AuthStatus,
  user: User | null
): boolean {
  return status === "authed" && !!user && user.onboardingRequired === true;
}

// True when auth pipeline says "authed" but we failed to load user data yet
// (typically due to /auth/me network issues). Used for "soft-loading" UIs.
export function isAuthedButUserMissing(
  status: AuthStatus,
  user: User | null
): boolean {
  return status === "authed" && !user;
}
