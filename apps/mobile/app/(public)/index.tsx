// app/(public)/index.tsx
// Public "home" screen:
// - Never calls protected endpoints.
// - Shows "Go to Login" for guests, "Go to Profile" for authed users.
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";
import { usePublicUpcomingFixturesQuery } from "@/features/fixtures/fixtures.queries";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { isApiError, isNetworkError } from "@/lib/query/queryErrors";
import { View } from "react-native";
import { Screen, AppText, Button } from "@/components/ui";
import { FixtureCardRow } from "@/features/fixtures/components/FixtureCardRow";
import { FloatingSubmitPicksButton } from "@/components/Picks/FloatingSubmitPicksButton";
import { sharedStyles } from "@/components/ui/styles";

export default function PublicIndex() {
  const router = useRouter();
  const { status } = useAuth();

  const { data, isLoading, isError, error, refetch } =
    usePublicUpcomingFixturesQuery({ page: 1, perPage: 20, days: 5 });

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
            <Button label="Go to Login" onPress={handleGoToLogin} />
          ) : null
        }
      />
    );
  }

  const fixtures = data?.data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll contentContainerStyle={{ paddingBottom: 100 }}>
        <AppText variant="title" style={sharedStyles.titleMargin}>
          Upcoming Fixtures
        </AppText>
        <AppText
          variant="subtitle"
          color="secondary"
          style={sharedStyles.subtitleMargin}
        >
          Public fixtures in the next 5 days
        </AppText>

        {fixtures.map((fx) => (
          <FixtureCardRow key={fx.id} fixture={fx} />
        ))}

        {fixtures.length === 0 && (
          <AppText
            variant="body"
            color="secondary"
            style={sharedStyles.emptyTextMargin}
          >
            No fixtures found.
          </AppText>
        )}

        {status === "guest" && (
          <Button
            label="Go to Login"
            onPress={handleGoToLogin}
            style={sharedStyles.buttonContainer}
          />
        )}

        {status === "authed" && (
          <Button
            label="Go to Profile"
            variant="secondary"
            onPress={handleGoToProfile}
            style={sharedStyles.buttonContainer}
          />
        )}
      </Screen>
      <FloatingSubmitPicksButton />
    </View>
  );
}
