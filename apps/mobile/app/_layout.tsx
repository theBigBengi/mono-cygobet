// Root layout for the Expo Router app.
// Composition order:
// - QueryClientProvider: provides React Query cache to the whole app.
// - ThemeProvider: provides theme context (light/dark mode support).
// - AuthProvider: manages auth state and wires auth into the HTTP client.
// - AppStartGate: handles app initialization (bootstrap + prefetch).
// - Stack: Navigation.
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";

import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { queryClient } from "@/lib/query/queryClient";
import { AppStartGate } from "@/components/AppStart/AppStartGate";

function AppContent() {
  const { colorScheme } = useTheme();

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <AppStartGate>
        {/* Explicitly start the app on the public home group */}
        <Stack
          initialRouteName="(public)"
          screenOptions={{ headerShown: false }}
        >
          {/* Public entry: no auth required */}
          <Stack.Screen name="(public)" options={{ headerShown: false }} />

          {/* Auth routes (login/register) */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Onboarding routes (username, etc.) */}
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />

          {/* Protected routes (require auth + onboarding complete) */}
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />

          {/* Example modal (kept from template)  */}
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", headerShown: false }}
          />
        </Stack>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </AppStartGate>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
