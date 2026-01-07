// lib/appStart/appStart.types.ts
// Types for app start state management.

export type AppStartStatus = "booting" | "ready" | "error";

export type AppStartErrorKind = "network" | "unknown";

export interface AppStartError {
  message: string;
  kind: AppStartErrorKind;
}

