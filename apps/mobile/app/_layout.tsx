import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Public entry */}
          <Stack.Screen name="(public)" options={{ headerShown: false }} />

          {/* Auth routes */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Onboarding routes */}
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />

          {/* Protected routes */}
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
  );
}
