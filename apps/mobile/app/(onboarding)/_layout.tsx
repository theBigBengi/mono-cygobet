// app/(onboarding)/_layout.tsx
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth/useAuth";

export default function OnboardingLayout() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Only allow access when authed AND onboarding required
  if (status !== "authed" || !user?.onboardingRequired) {
    // If authed but onboarding not required, redirect to protected app
    if (status === "authed" && user && !user.onboardingRequired) {
      return <Redirect href={"/(protected)/account" as any} />;
    }
    // Otherwise redirect to login
    return <Redirect href={"/(auth)/login" as any} />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
