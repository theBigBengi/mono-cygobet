// app/(protected)/profile.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@/lib/http/apiError";
import * as authApi from "@/lib/auth/auth.api";
import { useAuth } from "@/lib/auth/useAuth";

type ProfileState =
  | { status: "idle" | "loading" }
  | { status: "success"; data: import("@repo/types").ApiUserProfileResponse }
  | {
      status: "error";
      error: string;
      code?: string;
    };

export default function ProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  const loadProfile = async () => {
    setState({ status: "loading" });
    try {
      const data = await authApi.getProfile();
      setState({ status: "success", data });
    } catch (err) {
      if (err instanceof ApiError) {
        // Contract-compliant handling
        if (err.status === 403 && err.code === "ONBOARDING_REQUIRED") {
          // Onboarding redirect is handled globally by apiClient/layouts
          setState({
            status: "error",
            error: "Onboarding required. Redirecting to onboarding...",
            code: err.code,
          });
          return;
        }
        if (err.code === "NO_ACCESS_TOKEN") {
          setState({
            status: "error",
            error: "Auth not ready yet. Please retry.",
            code: err.code,
          });
          return;
        }
        if (err.status === 0) {
          setState({
            status: "error",
            error: "You appear to be offline. Please check your connection.",
            code: "NETWORK_ERROR",
          });
          return;
        }
        setState({
          status: "error",
          error: err.message || "Failed to load profile.",
          code: err.code,
        });
        return;
      }

      setState({
        status: "error",
        error: "Failed to load profile. Please try again.",
      });
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // logout errors are swallowed in AuthProvider; nothing else to do here
      console.error("Logout failed:", err);
    }
  };

  const handleBack = () => {
    router.replace("/(public)" as any);
  };

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.error}</Text>
        <Pressable style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.backButton]}
          onPress={handleBack}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const { user, profile } =
    state.status === "success" ? state.data : ({} as any);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User</Text>
        <Text style={styles.label}>
          ID: <Text style={styles.value}>{user.id}</Text>
        </Text>
        <Text style={styles.label}>
          Email: <Text style={styles.value}>{user.email}</Text>
        </Text>
        <Text style={styles.label}>
          Username: <Text style={styles.value}>{user.username ?? "—"}</Text>
        </Text>
        <Text style={styles.label}>
          Name: <Text style={styles.value}>{user.name ?? "—"}</Text>
        </Text>
        <Text style={styles.label}>
          Role: <Text style={styles.value}>{user.role}</Text>
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.label}>
          Level: <Text style={styles.value}>{profile.level}</Text>
        </Text>
        <Text style={styles.label}>
          Daily Streak: <Text style={styles.value}>{profile.dailyStreak}</Text>
        </Text>
        <Text style={styles.label}>
          Last Claim At:{" "}
          <Text style={styles.value}>
            {profile.lastClaimAt ? profile.lastClaimAt : "—"}
          </Text>
        </Text>
        <Text style={styles.label}>
          Favourite Team ID:{" "}
          <Text style={styles.value}>
            {profile.favouriteTeamId != null ? profile.favouriteTeamId : "—"}
          </Text>
        </Text>
        <Text style={styles.label}>
          Favourite League ID:{" "}
          <Text style={styles.value}>
            {profile.favouriteLeagueId != null
              ? profile.favouriteLeagueId
              : "—"}
          </Text>
        </Text>
        <Text style={styles.label}>
          Onboarding Done:{" "}
          <Text style={styles.value}>
            {profile.onboardingDone ? "Yes" : "No"}
          </Text>
        </Text>
      </View>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.backButton]}
        onPress={handleBack}
      >
        <Text style={styles.buttonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
  },
  value: {
    fontWeight: "500",
    color: "#000",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: "#555",
  },
  backButton: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
