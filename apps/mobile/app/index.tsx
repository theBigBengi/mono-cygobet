// Root entry point for the Expo Router app.
// Routes based on auth status:
// - Guest → Public Home
// - Logged in (onboarding complete) → Protected Home
// - Logged in (onboarding required) → Onboarding
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";
import {
  isReadyForProtected,
  isReadyForOnboarding,
} from "@/lib/auth/authGuards";
import { ActivityIndicator, View } from "react-native";

export default function RootIndex() {
  const { status, user } = useAuth();

  // Wait for initial bootstrap to complete
  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Logged in + onboarding complete → Protected Home
  if (isReadyForProtected(status, user)) {
    return <Redirect href={"/(protected)" as any} />;
  }

  // Logged in + onboarding required → Onboarding
  if (isReadyForOnboarding(status, user)) {
    return <Redirect href={"/(onboarding)/username" as any} />;
  }

  // Guest → Public Home
  return <Redirect href={"/(public)" as any} />;
}
