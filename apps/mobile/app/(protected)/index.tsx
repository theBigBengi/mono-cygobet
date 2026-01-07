// app/(protected)/index.tsx
// Protected home screen:
// - Entry point for authenticated + onboarded users.
// - Shows upcoming fixtures from the PROTECTED endpoint.
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useProtectedUpcomingFixturesQuery } from "@/features/fixtures/fixtures.queries";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  isApiError,
  isNetworkError,
  isOnboardingRequiredError,
} from "@/lib/query/queryErrors";

export default function ProtectedHomeScreen() {
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } =
    useProtectedUpcomingFixturesQuery({ page: 1, perPage: 20 });

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
      if (isOnboardingRequiredError(err)) {
        // Layout + apiClient handle onboarding routing; just show a friendly message.
        message = "Onboarding required. Redirecting to onboarding…";
      } else if (isNetworkError(err)) {
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
          <Pressable style={styles.button} onPress={handleGoToProfile}>
            <Text style={styles.buttonText}>Go to Profile</Text>
          </Pressable>
        }
      />
    );
  }

  const fixtures = data?.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>
        Protected upcoming fixtures (auth + onboarding required)
      </Text>

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

      <Pressable style={styles.button} onPress={handleGoToProfile}>
        <Text style={styles.buttonText}>Go to Profile</Text>
      </Pressable>
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
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
