// app/+not-found.tsx
// Handles unmatched routes (404)
import { Unmatched, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, AppText, Button } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";

export default function NotFound() {
  const { t } = useTranslation("common");
  const router = useRouter();

  const handleGoHome = () => {
    router.replace("/(tabs)/home");
  };

  return (
    <Screen>
      <AppText variant="title" style={sharedStyles.emptyTextMargin}>
        {t("errors.pageNotFound")}
      </AppText>
      <AppText variant="body" color="secondary" style={sharedStyles.emptyTextMargin}>
        {t("errors.pageNotFoundDescription")}
      </AppText>
      <Button
        label={t("errors.goToHome")}
        onPress={handleGoHome}
        style={sharedStyles.buttonContainer}
      />
      {/* Render default Unmatched component as fallback */}
      <Unmatched />
    </Screen>
  );
}
