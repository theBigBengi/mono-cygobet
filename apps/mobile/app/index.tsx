// app/index.tsx
// Root index route - redirects based on auth status

import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";

export default function Index() {
  const { status, user, bootstrap } = useAuth();
  useEffect(() => {
    if (status === "idle") {
      // Kick off restore when app first mounts
      bootstrap().catch((e) => {
        console.error("App start bootstrap failed:", e);
      });
    }
  }, [status, bootstrap]);
  const { theme } = useTheme();

  // Show loading state while auth status is being determined
  // If the app has not started restoring yet, show a splash immediately.
  if (status === "idle") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      />
    );
  }

  if (status === "restoring") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Redirect authenticated users
  if (status === "authenticated") {
    // If user has no username, redirect to username selection screen
    if (!user?.username) {
      return <Redirect href="/username" />;
    }
    // If user has username, redirect to home
    return <Redirect href="/(tabs)/home" />;
  }

  if (status === "onboarding") {
    return <Redirect href="/username" />;
  }

  if (status === "degraded") {
    // Show a clear degraded screen - keep simple here (could be a full screen)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Redirect guests to sign-in
  return <Redirect href="/sign-in" />;
}
