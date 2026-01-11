// src/app-shell/appbar/useAppBarConfig.ts
// Hook for screens to easily configure AppBar on mount/unmount.
// Handles automatic cleanup and modal route detection.

import { useEffect, useRef } from "react";
import { useAppBarSetters } from "./appBar.store";
import type { AppBarConfig, PartialAppBarConfig } from "./AppBar.types";

/**
 * Hook for screens to configure AppBar on mount.
 * Automatically resets AppBar on unmount (unless keepOnUnmount is true).
 * Detects modal routes and hides AppBar by default.
 *
 * @param config - AppBar configuration to set when component mounts
 * @param keepOnUnmount - If true, does not reset AppBar on unmount (default: false)
 */
export function useAppBarConfig(
  config: AppBarConfig | PartialAppBarConfig,
  keepOnUnmount = false
) {
  const { setAppBar, mergeAppBar, resetAppBar } = useAppBarSetters();
  const configRef = useRef(config);

  // Update ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    const currentConfig = configRef.current;

    // Determine if this is a full config or partial config
    // Full config has required fields: visible and variant
    const isFullConfig =
      "visible" in currentConfig &&
      "variant" in currentConfig &&
      currentConfig.visible !== undefined &&
      currentConfig.variant !== undefined;

    if (isFullConfig) {
      // Full config - use setAppBar (replaces entire config)
      setAppBar(currentConfig as AppBarConfig);
    } else {
      // Partial config - use mergeAppBar (merges with current)
      mergeAppBar(currentConfig as PartialAppBarConfig);
    }

    // Cleanup: reset on unmount by default (unless keepOnUnmount is true)
    // This ensures screens don't leave stale AppBar config after navigation.
    return () => {
      if (!keepOnUnmount) {
        resetAppBar();
      }
    };
  }, [setAppBar, mergeAppBar, resetAppBar, keepOnUnmount]);
}

