// app/(protected)/profile.tsx
// Protected profile screen:
// - Only accessible when auth is "authed" and onboarding is complete (guarded in layout).
// - Reads server data exclusively via useProfileQuery() (React Query).
// - Provides navigation back to protected home and a Logout button.
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
import { Screen, AppText, Button, Card } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";

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
          <Button label="Logout" variant="danger" onPress={handleLogout} />
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
    <Screen scroll>
      <AppText variant="title" style={sharedStyles.profileTitle}>
        Profile
      </AppText>

      <Card style={sharedStyles.cardMargin}>
        <AppText variant="subtitle" style={sharedStyles.sectionTitleMargin}>
          User
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          ID: <AppText variant="body">{user.id}</AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Email: <AppText variant="body">{user.email}</AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Username: <AppText variant="body">{user.username ?? "—"}</AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Name: <AppText variant="body">{user.name ?? "—"}</AppText>
        </AppText>
        <AppText variant="body">
          Role: <AppText variant="body">{user.role}</AppText>
        </AppText>
      </Card>

      <Card style={sharedStyles.cardMargin}>
        <AppText variant="subtitle" style={sharedStyles.sectionTitleMargin}>
          Profile
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Level: <AppText variant="body">{profile.level}</AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Daily Streak: <AppText variant="body">{profile.dailyStreak}</AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Last Claim At:{" "}
          <AppText variant="body">
            {profile.lastClaimAt ? profile.lastClaimAt : "—"}
          </AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Favourite Team ID:{" "}
          <AppText variant="body">
            {profile.favouriteTeamId != null ? profile.favouriteTeamId : "—"}
          </AppText>
        </AppText>
        <AppText variant="body" style={sharedStyles.labelMargin}>
          Favourite League ID:{" "}
          <AppText variant="body">
            {profile.favouriteLeagueId != null
              ? profile.favouriteLeagueId
              : "—"}
          </AppText>
        </AppText>
        <AppText variant="body">
          Onboarding Done:{" "}
          <AppText variant="body">
            {profile.onboardingDone ? "Yes" : "No"}
          </AppText>
        </AppText>
      </Card>

      <Button
        label="Go to Home"
        variant="secondary"
        onPress={handleGoHome}
        style={sharedStyles.buttonContainer}
      />
      <Button label="Logout" variant="danger" onPress={handleLogout} />
    </Screen>
  );
}
