// app/(protected)/index.tsx
// Protected home screen:
// - Entry point for authenticated + onboarded users.
// - Shows upcoming fixtures from the PROTECTED endpoint.
import { useRouter } from "expo-router";
import { useProtectedUpcomingFixturesQuery } from "@/features/fixtures/fixtures.queries";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  isApiError,
  isNetworkError,
  isOnboardingRequiredError,
} from "@/lib/query/queryErrors";
import { View } from "react-native";
import { Screen, AppText, Button } from "@/components/ui";
import { FixtureCardRow } from "@/features/fixtures/components/FixtureCardRow";
import { FloatingSubmitPicksButton } from "@/components/Picks/FloatingSubmitPicksButton";
import { sharedStyles } from "@/components/ui/styles";
import { useAppBarConfig, AppBarButton } from "@/app-shell/appbar";

export default function ProtectedHomeScreen() {
  const router = useRouter();

  // Configure AppBar for this screen
  useAppBarConfig({
    visible: true,
    variant: "default",
    slots: {
      center: <AppText variant="subtitle">Home</AppText>,
      right: (
        <AppBarButton
          onPress={() => router.push("/(protected)/profile" as any)}
        >
          <AppText variant="body">Profile</AppText>
        </AppBarButton>
      ),
    },
  });

  const { data, isLoading, isError, error, refetch } =
    useProtectedUpcomingFixturesQuery({ page: 1, perPage: 20 });

  const handleGoToProfile = () => {
    router.push("/(protected)/profile" as any);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <QueryLoadingView message="Loading upcoming fixtures..." />
      </View>
    );
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
          <Button label="Go to Profile" onPress={handleGoToProfile} />
        }
      />
    );
  }

  const fixtures = data?.data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
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
      </Screen>
      <FloatingSubmitPicksButton />
    </View>
  );
}
