// app/(protected)/_layout.tsx
import { Redirect, Slot } from "expo-router";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useAuth } from "@/lib/auth/useAuth";
import {
  isReadyForOnboarding,
  isReadyForProtected,
  isAuthedButUserMissing,
} from "@/lib/auth/authGuards";

export default function ProtectedLayout() {
  const { status, user, bootstrap } = useAuth();

  // True loading: initial bootstrap or explicit retry in progress
  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === "guest") {
    return <Redirect href={"/(public)" as any} />;
  }

  // If authed but user is still null (e.g. /auth/me network issue), treat as soft-loading
  if (isAuthedButUserMissing(status, user)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Reconnecting…</Text>
        <Pressable style={styles.button} onPress={bootstrap}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // If authed but onboarding required, redirect to onboarding
  if (isReadyForOnboarding(status, user)) {
    return <Redirect href={"/(onboarding)/username" as any} />;
  }

  // Fully authed + onboarding complete
  if (isReadyForProtected(status, user)) {
    return <Slot />;
  }

  // Fallback: shouldn't normally happen, but keep UX safe
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
