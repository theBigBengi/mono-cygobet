// app/+not-found.tsx
// Handles unmatched routes (404)
import { Unmatched, useRouter } from "expo-router";
import { Screen, AppText, Button } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router.replace("/(tabs)/home");
  };

  return (
    <Screen>
      <AppText variant="title" style={sharedStyles.emptyTextMargin}>
        Page Not Found
      </AppText>
      <AppText variant="body" color="secondary" style={sharedStyles.emptyTextMargin}>
        The page you&apos;re looking for doesn&apos;t exist.
      </AppText>
      <Button
        label="Go to Home"
        onPress={handleGoHome}
        style={sharedStyles.buttonContainer}
      />
      {/* Render default Unmatched component as fallback */}
      <Unmatched />
    </Screen>
  );
}
