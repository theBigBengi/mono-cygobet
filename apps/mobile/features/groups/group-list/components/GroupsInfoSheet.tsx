// features/groups/group-list/components/GroupsInfoSheet.tsx
// Bottom sheet with explanation of the groups screen and status bar icons.

import React from "react";
import { View, StyleSheet } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

interface GroupsInfoSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
}

export function GroupsInfoSheet({ sheetRef }: GroupsInfoSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <InfoSheet sheetRef={sheetRef} enableDynamicSizing>
      <AppText variant="subtitle" style={styles.header}>
        {t("groups.info.title")}
      </AppText>
      <AppText variant="body" color="secondary" style={styles.description}>
        {t("groups.info.description")}
      </AppText>

      <AppText variant="body" style={styles.sectionHeader}>
        {t("groups.info.statusBarTitle")}
      </AppText>

      {/* Members */}
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.border }]}>
          <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.rowText}>
          <AppText variant="body" style={styles.label}>
            {t("groups.info.members")}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t("groups.info.membersDesc")}
          </AppText>
        </View>
      </View>

      {/* Rank */}
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.border }]}>
          <Ionicons name="trophy-outline" size={18} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.rowText}>
          <AppText variant="body" style={styles.label}>
            {t("groups.info.rank")}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t("groups.info.rankDesc")}
          </AppText>
        </View>
      </View>

      {/* Predictions with color explanations */}
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.rowText}>
          <AppText variant="body" style={styles.label}>
            {t("groups.info.predictions")}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t("groups.info.predictionsDesc")}
          </AppText>
          <View style={styles.colorList}>
            <View style={styles.colorItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.colors.success }]} />
              <AppText variant="caption" color="secondary">
                {t("groups.info.predictionsGreen")}
              </AppText>
            </View>
            <View style={styles.colorItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.colors.warning }]} />
              <AppText variant="caption" color="secondary">
                {t("groups.info.predictionsOrange")}
              </AppText>
            </View>
            <View style={styles.colorItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.colors.danger }]} />
              <AppText variant="caption" color="secondary">
                {t("groups.info.predictionsRed")}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* Games/Completion with color explanations */}
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.border }]}>
          <Ionicons name="football-outline" size={18} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.rowText}>
          <AppText variant="body" style={styles.label}>
            {t("groups.info.completion")}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t("groups.info.completionDesc")}
          </AppText>
          <View style={styles.colorList}>
            <View style={styles.colorItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.colors.primary }]} />
              <AppText variant="caption" color="secondary">
                {t("groups.info.completionPrimary")}
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionHeader: {
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  label: {
    fontWeight: "600",
    marginBottom: 2,
  },
  colorList: {
    marginTop: 8,
    gap: 4,
  },
  colorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
