import type { AuthStatus, User } from "./auth.types";

export const isIdle = (status: AuthStatus | string) => status === "idle";
export const isRestoring = (status: AuthStatus | string) => status === "restoring";
export const isAuthenticated = (status: AuthStatus | string) => status === "authenticated";
export const isOnboarding = (status: AuthStatus | string) => status === "onboarding";
export const isUnauthenticated = (status: AuthStatus | string) => status === "unauthenticated";
export const isDegraded = (status: AuthStatus | string) => status === "degraded";

export const isReadyForProtected = (status: AuthStatus | string, user: User | null) =>
  isAuthenticated(status) && !!user && user.onboardingRequired === false;

export default {
  isIdle,
  isRestoring,
  isAuthenticated,
  isOnboarding,
  isUnauthenticated,
  isDegraded,
  isReadyForProtected,
};

