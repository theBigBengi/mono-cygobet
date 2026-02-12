// features/group-creation/components/SelectionModeInfoSheet.tsx
// Bottom sheet explaining the selection modes: Games, Leagues, Teams.

import React from "react";
import { View, StyleSheet } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

interface SelectionModeInfoSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
}

export function SelectionModeInfoSheet({
  sheetRef,
}: SelectionModeInfoSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const modes = [
    {
      icon: "football-outline" as const,
      title: t("groupCreation.info.games.title"),
      description: t("groupCreation.info.games.description"),
    },
    {
      icon: "trophy-outline" as const,
      title: t("groupCreation.info.leagues.title"),
      description: t("groupCreation.info.leagues.description"),
    },
    {
      icon: "shirt-outline" as const,
      title: t("groupCreation.info.teams.title"),
      description: t("groupCreation.info.teams.description"),
    },
  ];

  return (
    <InfoSheet sheetRef={sheetRef} snapPoints={["85%"]}>
      <AppText variant="title" style={styles.title}>
        {t("groupCreation.info.title")}
      </AppText>

      <AppText variant="body" color="secondary" style={styles.intro}>
        {t("groupCreation.info.intro")}
      </AppText>

      {modes.map((mode, index) => (
        <View
          key={index}
          style={[
            styles.modeCard,
            { backgroundColor: theme.colors.border + "30" },
          ]}
        >
          <View style={styles.modeHeader}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary + "20" },
              ]}
            >
              <Ionicons
                name={mode.icon}
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <AppText variant="subtitle" style={styles.modeTitle}>
              {mode.title}
            </AppText>
          </View>
          <AppText variant="body" color="secondary" style={styles.modeDescription}>
            {mode.description}
          </AppText>
        </View>
      ))}
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  intro: {
    marginBottom: 20,
    lineHeight: 22,
  },
  modeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: 12,
  },
  modeTitle: {
    fontWeight: "600",
  },
  modeDescription: {
    lineHeight: 20,
  },
});
