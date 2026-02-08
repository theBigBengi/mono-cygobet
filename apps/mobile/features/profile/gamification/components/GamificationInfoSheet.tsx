import React from "react";
import { View, StyleSheet } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { AppText } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

export type GamificationFeatureId =
  | "powerScore"
  | "rankTier"
  | "skills"
  | "streak"
  | "seasonComparison";

interface GamificationInfoSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  featureId: GamificationFeatureId | null;
}

export function GamificationInfoSheet({
  sheetRef,
  featureId,
}: GamificationInfoSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  if (!featureId) return null;

  const title = t(`gamification.info.${featureId}.title`);
  const description = t(`gamification.info.${featureId}.description`);
  const calculation = t(`gamification.info.${featureId}.calculation`);

  return (
    <InfoSheet sheetRef={sheetRef}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>

      <AppText variant="body" color="secondary" style={styles.description}>
        {description}
      </AppText>

      <View
        style={[
          styles.calculationBox,
          { backgroundColor: theme.colors.border + "40" },
        ]}
      >
        <AppText variant="caption" style={styles.calculationLabel}>
          {t("gamification.info.howCalculated")}
        </AppText>
        <AppText variant="body">{calculation}</AppText>
      </View>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  description: {
    marginBottom: 20,
    lineHeight: 22,
  },
  calculationBox: {
    padding: 16,
    borderRadius: 12,
  },
  calculationLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
});
