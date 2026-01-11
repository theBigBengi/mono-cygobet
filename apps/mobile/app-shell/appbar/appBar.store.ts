// src/app-shell/appbar/appBar.store.ts
// Pure store logic for AppBar configuration.
// No React components, only state management and hooks.

import { createContext, useContext } from "react";
import type { AppBarConfig, PartialAppBarConfig } from "./AppBar.types";

interface AppBarContextValue {
  /** Current AppBar configuration */
  config: AppBarConfig;
  /** Replace the entire AppBar configuration */
  setAppBar: (config: AppBarConfig) => void;
  /** Merge partial configuration into current config */
  mergeAppBar: (partialConfig: PartialAppBarConfig) => void;
  /** Reset AppBar to default configuration */
  resetAppBar: () => void;
}

/**
 * AppBar context (created once at module level).
 * Used by AppBarProvider and internal hooks.
 */
export const AppBarContext = createContext<AppBarContextValue | null>(null);

/**
 * Internal hook to access AppBar store.
 * Not exported - screens should use useAppBarConfig instead.
 */
export function useAppBarStore(): AppBarContextValue {
  const context = useContext(AppBarContext);
  if (!context) {
    throw new Error("useAppBarStore must be used within an AppBarProvider");
  }
  return context;
}

/**
 * Internal hook to get AppBar setter functions.
 * Not exported - screens should use useAppBarConfig instead.
 */
export function useAppBarSetters() {
  const { setAppBar, mergeAppBar, resetAppBar } = useAppBarStore();
  return { setAppBar, mergeAppBar, resetAppBar };
}

/**
 * Internal hook to read current AppBar configuration.
 * Not exported - AppBar component uses this internally.
 */
export function useAppBarConfigInternal(): AppBarConfig {
  return useAppBarStore().config;
}
