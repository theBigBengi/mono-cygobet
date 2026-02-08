// features/profile/stats/components/BadgesInfoSheet.tsx
// Bottom sheet modal (@gorhom/bottom-sheet) with badge icons and descriptions.
// Renders above tabs via BottomSheetModalProvider in root layout.

import React from "react";
import { View, StyleSheet } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Ionicons,
  FontAwesome5,
  FontAwesome6,
  AntDesign,
} from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { ApiBadge } from "@repo/types";

interface BadgesInfoSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  badges: ApiBadge[];
}

function BadgeIcon({ badgeId, color }: { badgeId: string; color: string }) {
  if (badgeId === "early_bird")
    return <FontAwesome5 name="earlybirds" size={24} color={color} />;
  if (badgeId === "underdog_caller")
    return <FontAwesome6 name="shield-dog" size={24} color={color} />;
  if (badgeId === "sharpshooter")
    return <AntDesign name="aim" size={24} color={color} />;
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    streak_master: "flash",
    group_champion: "medal",
    consistency_king: "stats-chart",
  };
  return (
    <Ionicons name={iconMap[badgeId] ?? "ribbon"} size={24} color={color} />
  );
}

export function BadgesInfoSheet({ sheetRef, badges }: BadgesInfoSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <InfoSheet sheetRef={sheetRef} snapPoints={["75%", "95%"]}>
      <AppText variant="subtitle" style={styles.header}>
        {t("profile.badgesInfo")}
      </AppText>
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={[styles.row, { borderBottomColor: theme.colors.border }]}
        >
          <BadgeIcon
            badgeId={badge.id}
            color={
              badge.earned ? theme.colors.primary : theme.colors.textSecondary
            }
          />
          <View style={styles.rowText}>
            <AppText variant="body" style={styles.badgeName}>
              {badge.name}
            </AppText>
            <AppText variant="caption" color="secondary">
              {badge.description}
            </AppText>
          </View>
        </View>
      ))}
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  badgeName: { fontWeight: "600", marginBottom: 4 },
});
