// features/groups/group-list/components/GroupsInfoSheet.tsx

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

const GREEN = "#10B981";
const RED = "#EF4444";
const YELLOW = "#EAB308";
const ORANGE = "#F97316";
const PINK = "#EC4899";
const DIMMED = "#9CA3AF";

export function GroupsInfoSheet({ sheetRef }: GroupsInfoSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <InfoSheet sheetRef={sheetRef} snapPoints={["90%"]}>
      <AppText variant="title" style={styles.title}>
        {t("groups.info.title")}
      </AppText>

      {/* === RANKING === */}
      <View style={styles.section}>
        <View style={styles.header}>
          <Ionicons name="trophy-outline" size={20} color={DIMMED} />
          <AppText variant="subtitle">{t("groups.info.ranking")}</AppText>
        </View>

        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.rankingOff")}
        </AppText>

        <AppText variant="body" style={styles.lightUpLabel}>
          {t("groups.info.lightsUp")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.rankingOn")}
        </AppText>

        <View style={styles.colorsRow}>
          <View style={[styles.colorChip, { backgroundColor: GREEN + "20" }]}>
            <Ionicons name="caret-up" size={12} color={GREEN} />
            <AppText variant="caption" style={{ color: GREEN, fontWeight: "700" }}>
              {t("groups.info.up")}
            </AppText>
          </View>
          <View style={[styles.colorChip, { backgroundColor: RED + "20" }]}>
            <Ionicons name="caret-down" size={12} color={RED} />
            <AppText variant="caption" style={{ color: RED, fontWeight: "700" }}>
              {t("groups.info.down")}
            </AppText>
          </View>
        </View>
      </View>

      {/* === PREDICTIONS === */}
      <View style={styles.section}>
        <View style={styles.header}>
          <Ionicons name="create-outline" size={20} color={DIMMED} />
          <AppText variant="subtitle">{t("groups.info.predictions")}</AppText>
        </View>

        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.predictionsOff")}
        </AppText>

        <AppText variant="body" style={styles.lightUpLabel}>
          {t("groups.info.lightsUp")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.predictionsOn")}
        </AppText>

        <View style={styles.colorsList}>
          <View style={styles.colorRow}>
            <View style={[styles.dot, { backgroundColor: YELLOW }]} />
            <AppText variant="caption" color="secondary">{t("groups.info.predictionsYellow")}</AppText>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.dot, { backgroundColor: ORANGE }]} />
            <AppText variant="caption" color="secondary">{t("groups.info.predictionsOrange")}</AppText>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.dot, { backgroundColor: RED }]} />
            <AppText variant="caption" color="secondary">{t("groups.info.predictionsRed")}</AppText>
          </View>
        </View>

        <View style={[styles.colorRow, { marginTop: 8 }]}>
          <Ionicons name="checkmark-circle" size={14} color={GREEN} />
          <AppText variant="caption" color="secondary">{t("groups.info.predictionsComplete")}</AppText>
        </View>
      </View>

      {/* === LIVE === */}
      <View style={styles.section}>
        <View style={styles.header}>
          <Ionicons name="football-outline" size={20} color={DIMMED} />
          <AppText variant="subtitle">{t("groups.info.live")}</AppText>
        </View>

        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.liveOff")}
        </AppText>

        <AppText variant="body" style={styles.lightUpLabel}>
          {t("groups.info.lightsUp")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.liveOn")}
        </AppText>

        <View style={styles.colorRow}>
          <View style={[styles.dot, { backgroundColor: PINK }]} />
          <AppText variant="caption" style={{ color: PINK, fontWeight: "600" }}>LIVE</AppText>
        </View>
      </View>

      {/* === CHAT === */}
      <View style={styles.section}>
        <View style={styles.header}>
          <Ionicons name="chatbubble-outline" size={20} color={DIMMED} />
          <AppText variant="subtitle">{t("groups.info.chat")}</AppText>
        </View>

        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.chatOff")}
        </AppText>

        <AppText variant="body" style={styles.lightUpLabel}>
          {t("groups.info.lightsUp")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.desc}>
          {t("groups.info.chatOn")}
        </AppText>

        <View style={styles.colorRow}>
          <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
          <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: "600" }}>
            {t("groups.info.chatUnread")}
          </AppText>
        </View>
      </View>

      {/* === BADGES === */}
      <View style={[styles.section, styles.badgesSection]}>
        <AppText variant="subtitle" style={{ marginBottom: 12 }}>
          {t("groups.info.badgesTitle")}
        </AppText>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.textSecondary + "20" }]}>
            <AppText style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary }}>C</AppText>
          </View>
          <AppText variant="caption" color="secondary">{t("groups.info.roleCreator")}</AppText>
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.textSecondary + "20" }]}>
            <AppText style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary }}>A</AppText>
          </View>
          <AppText variant="caption" color="secondary">{t("groups.info.roleAdmin")}</AppText>
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.textSecondary + "20" }]}>
            <AppText style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary }}>M</AppText>
          </View>
          <AppText variant="caption" color="secondary">{t("groups.info.roleMember")}</AppText>
        </View>

        <View style={[styles.badgeRow, { marginTop: 10 }]}>
          <View style={[styles.badge, { backgroundColor: theme.colors.textSecondary + "20" }]}>
            <Ionicons name="lock-closed" size={11} color={theme.colors.textSecondary} />
          </View>
          <AppText variant="caption" color="secondary">{t("groups.info.privacyPrivate")}</AppText>
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.textSecondary + "20" }]}>
            <Ionicons name="globe-outline" size={11} color={theme.colors.textSecondary} />
          </View>
          <AppText variant="caption" color="secondary">{t("groups.info.privacyPublic")}</AppText>
        </View>
      </View>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  desc: {
    lineHeight: 20,
  },
  lightUpLabel: {
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  colorsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  colorsList: {
    marginTop: 10,
    gap: 4,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badgesSection: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
