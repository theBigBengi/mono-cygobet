// app/index.tsx
// Root index route - redirects based on auth status

import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";

export default function Index() {
  const { status, user } = useAuth();
  const { theme } = useTheme();

  // Show loading state while auth status is being determined
  if (status === "loading") {
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
  if (status === "authed") {
    // If user has no username, redirect to username selection screen
    if (!user?.username) {
      return <Redirect href="/username" />;
    }
    // If user has username, redirect to home
    return <Redirect href="/(tabs)/home" />;
  }

  // Redirect guests to sign-in
  return <Redirect href="/sign-in" />;
}
