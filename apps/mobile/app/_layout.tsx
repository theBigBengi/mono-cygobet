// Root layout for the Expo Router app.
// Composition order:
// - QueryClientProvider: provides React Query cache to the whole app.
// - AuthProvider: manages auth state and wires auth into the HTTP client.
// - ThemeProvider + Stack: UI/theme + navigation.
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { queryClient } from "@/lib/query/queryClient";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          {/* Explicitly start the app on the public home group */}
          <Stack initialRouteName="(public)">
            {/* Public entry: no auth required */}
            <Stack.Screen name="(public)" options={{ headerShown: false }} />

            {/* Auth routes (login/register) */}
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />

            {/* Onboarding routes (username, etc.) */}
            <Stack.Screen
              name="(onboarding)"
              options={{ headerShown: false }}
            />

            {/* Protected routes (require auth + onboarding complete) */}
            <Stack.Screen name="(protected)" options={{ headerShown: false }} />

            {/* Example modal (kept from template) */}
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
