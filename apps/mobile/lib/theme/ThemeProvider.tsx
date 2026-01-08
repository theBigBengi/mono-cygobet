// lib/theme/ThemeProvider.tsx
// Theme provider that resolves and exposes theme to the app.
// Infrastructure only - no business logic, no auth, no persistence.

import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import type { ReactNode } from "react";
import { resolveColorScheme, resolveTheme } from "./theme.resolver";
import type { Theme, ThemeMode } from "./theme.types";

interface ThemeContextValue {
  theme: Theme;
  colorScheme: Theme["colorScheme"];
  mode: ThemeMode;
  setMode: (nextMode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Internal state for theme mode (default: "system")
  const [mode, setMode] = useState<ThemeMode>("system");
  const systemColorScheme = useColorScheme();

  const colorScheme = useMemo(
    () => resolveColorScheme(mode, systemColorScheme),
    [mode, systemColorScheme]
  );
  const theme = useMemo(() => resolveTheme(colorScheme), [colorScheme]);

  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      colorScheme,
      mode,
      setMode,
    }),
    [theme, colorScheme, mode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
