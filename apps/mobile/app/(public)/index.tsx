// app/(public)/index.tsx
// Public "home" screen:
// - Never calls protected endpoints.
// - Shows "Go to Login" for guests, "Go to Profile" for authed users.
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";
import { usePublicUpcomingFixturesQuery } from "@/features/fixtures/fixtures.queries";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { isApiError, isNetworkError } from "@/lib/query/queryErrors";

export default function PublicIndex() {
  const router = useRouter();
  const { status } = useAuth();

  const { data, isLoading, isError, error, refetch } =
    usePublicUpcomingFixturesQuery({ page: 1, perPage: 20 });

  const handleGoToLogin = () => {
    router.push("/(auth)/login" as any);
  };

  const handleGoToProfile = () => {
    router.push("/(protected)/profile" as any);
  };

  if (isLoading) {
    return <QueryLoadingView message="Loading upcoming fixtures..." />;
  }

  if (isError) {
    let message = "Failed to load fixtures. Please try again.";

    const err: unknown = error;
    if (err && isApiError(err)) {
      if (isNetworkError(err)) {
        message = "You appear to be offline. Please check your connection.";
      } else {
        const rawMessage = (err as any).message;
        if (rawMessage) {
          message = String(rawMessage);
        }
      }
    }

    return (
      <QueryErrorView
        message={message}
        onRetry={() => refetch()}
        extraActions={
          status === "guest" ? (
            <Pressable style={styles.button} onPress={handleGoToLogin}>
              <Text style={styles.buttonText}>Go to Login</Text>
            </Pressable>
          ) : null
        }
      />
    );
  }

  const fixtures = data?.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upcoming Fixtures</Text>
      <Text style={styles.subtitle}>Public fixtures in the next 5 days</Text>

      {fixtures.map((fx) => (
        <View key={fx.id} style={styles.fixtureCard}>
          <Text style={styles.leagueName}>
            {fx.league?.name ?? "Unknown league"}
          </Text>
          <Text style={styles.fixtureTeams}>
            {fx.homeTeam?.name ?? "Home"} vs {fx.awayTeam?.name ?? "Away"}
          </Text>
          <Text style={styles.kickoff}>Kickoff: {fx.kickoffAt}</Text>
        </View>
      ))}

      {fixtures.length === 0 && (
        <Text style={styles.emptyText}>No fixtures found.</Text>
      )}

      {status === "guest" && (
        <Pressable style={styles.button} onPress={handleGoToLogin}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </Pressable>
      )}

      {status === "authed" && (
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleGoToProfile}
        >
          <Text style={styles.buttonText}>Go to Profile</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#555",
  },
  fixtureCard: {
    width: "100%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 12,
  },
  leagueName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  fixtureTeams: {
    fontSize: 16,
    marginBottom: 4,
  },
  kickoff: {
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
});
