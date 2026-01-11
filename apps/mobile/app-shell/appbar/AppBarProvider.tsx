// src/app-shell/appbar/AppBarProvider.tsx
// AppBar context provider component.
// Wraps the app to provide AppBar configuration state.

import React, { useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { AppBarConfig, PartialAppBarConfig } from "./AppBar.types";
import { defaultAppBarConfig } from "./AppBar.types";
import { AppBarContext } from "./appBar.store";

interface AppBarProviderProps {
  children: ReactNode;
  /** Initial configuration (optional, defaults to defaultAppBarConfig) */
  initialConfig?: AppBarConfig;
}

export function AppBarProvider({
  children,
  initialConfig = defaultAppBarConfig,
}: AppBarProviderProps) {
  const [config, setConfig] = useState<AppBarConfig>(initialConfig);

  const setAppBar = useCallback((newConfig: AppBarConfig) => {
    setConfig(newConfig);
  }, []);

  const mergeAppBar = useCallback((partialConfig: PartialAppBarConfig) => {
    setConfig((current) => {
      const merged: AppBarConfig = {
        ...current,
        ...partialConfig,
        slots: {
          ...current.slots,
          ...partialConfig.slots,
        },
        styleOverrides: {
          ...current.styleOverrides,
          ...partialConfig.styleOverrides,
        },
      };
      return merged;
    });
  }, []);

  const resetAppBar = useCallback(() => {
    setConfig(defaultAppBarConfig);
  }, []);

  const value = useMemo(
    () => ({
      config,
      setAppBar,
      mergeAppBar,
      resetAppBar,
    }),
    [config, setAppBar, mergeAppBar, resetAppBar]
  );

  return (
    <AppBarContext.Provider value={value}>{children}</AppBarContext.Provider>
  );
}
