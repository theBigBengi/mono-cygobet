// app/(protected)/profile.tsx
// Protected profile screen:
// - Only accessible when auth is "authed" and onboarding is complete (guarded in layout).
// - Reads server data exclusively via useProfileQuery() (React Query).
// - Provides navigation back to protected home and a Logout button.
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";
import { useProfileQuery } from "@/features/profile/profile.queries";
import {
  isApiError,
  isNetworkError,
  isNoAccessTokenError,
  isOnboardingRequiredError,
} from "@/lib/query/queryErrors";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";

export default function ProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useProfileQuery();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // logout errors are swallowed in AuthProvider; nothing else to do here
      console.error("Logout failed:", err);
    }
  };

  const handleGoHome = () => {
    // Replace the current route with protected home so we don't stack history.
    router.replace("/(protected)" as any);
  };

  if (isLoading) {
    return <QueryLoadingView message="Loading profile..." />;
  }

  if (isError) {
    let message = "Failed to load profile. Please try again.";

    const err: unknown = error;
    if (err && isApiError(err)) {
      if (isOnboardingRequiredError(err)) {
        message = "Onboarding required. Please complete onboarding first.";
      } else if (isNoAccessTokenError(err)) {
        message = "Auth not ready yet. Please retry.";
      } else if (isNetworkError(err)) {
        message = "You were disconnected. Please check your connection.";
      } else {
        message = String((err as any).message ?? message);
      }
    }

    return (
      <QueryErrorView
        message={message}
        onRetry={() => refetch()}
        extraActions={
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        }
      />
    );
  }

  if (!data) {
    // Should not happen when enabled, but guard just in case.
    return <QueryLoadingView message="Loading profile..." />;
  }

  const { user, profile } = data;

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

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={handleGoHome}
      >
        <Text style={styles.buttonText}>Go to Home</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
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
