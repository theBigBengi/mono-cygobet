// features/groups/group-lobby/components/GroupInfoSheet.tsx
// Bottom sheet with group info and rules.

import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";

interface GroupInfoSheetProps {
  group: ApiGroupItem;
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  /** When true, shows skeleton instead of content (prevents jump during background refetch) */
  isLoading?: boolean;
}

function InfoSection({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
        <AppText variant="subtitle" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      <View
        style={[styles.sectionContent, { borderTopColor: theme.colors.border }]}
      >
        {children}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="caption" color="secondary">
        • {label}:
      </AppText>
      <AppText variant="body" style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

function generateRulesExplanation(group: ApiGroupItem, t: TFunction): string {
  const parts: string[] = [];

  if (group.predictionMode === "CorrectScore") {
    parts.push(t("groupInfo.rules.correctScoreMode"));
  } else {
    parts.push(t("groupInfo.rules.matchWinnerMode"));
  }

  if (group.predictionMode === "CorrectScore") {
    parts.push(
      t("groupInfo.rules.scoring", {
        exact: group.onTheNosePoints ?? 3,
        diff: group.correctDifferencePoints ?? 2,
        outcome: group.outcomePoints ?? 1,
      })
    );
  }

  if (group.selectionMode === "leagues") {
    parts.push(t("groupInfo.rules.leaguesMode"));
  } else if (group.selectionMode === "teams") {
    parts.push(t("groupInfo.rules.teamsMode"));
  } else {
    parts.push(t("groupInfo.rules.gamesMode"));
  }

  if (group.koRoundMode === "Penalties") {
    parts.push(t("groupInfo.rules.koPenalties"));
  } else if (group.koRoundMode === "ExtraTime") {
    parts.push(t("groupInfo.rules.koExtraTime"));
  }

  return parts.join(" ");
}

function InfoSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <View
            style={[
              styles.skeletonTitle,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View
            style={[
              styles.skeletonRow,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View
            style={[
              styles.skeletonRow,
              { backgroundColor: theme.colors.border },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export function GroupInfoSheet({
  group,
  sheetRef,
  isLoading = false,
}: GroupInfoSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [snapshotGroup, setSnapshotGroup] = useState<ApiGroupItem | null>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        setSnapshotGroup((prev) => prev ?? group);
      } else if (index === -1) {
        setSnapshotGroup(null);
      }
    },
    [group]
  );

  const displayGroup = snapshotGroup ?? group;
  const explanation = useMemo(() => {
    if (!snapshotGroup) return "";
    return generateRulesExplanation(snapshotGroup, t);
  }, [snapshotGroup, t]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <AppText variant="title" style={styles.title}>
          {t("groupInfo.title")}
        </AppText>

        {isLoading ? (
          <InfoSkeleton />
        ) : (
          <>
            <InfoSection
              icon="information-circle-outline"
              title={t("groupInfo.general")}
            >
              <InfoRow
                label={t("groupInfo.status")}
                value={t(`groupInfo.statusValues.${displayGroup.status}`)}
              />
              <InfoRow
                label={t("groupInfo.members")}
                value={`${displayGroup.memberCount ?? 0}/${displayGroup.maxMembers ?? 50}`}
              />
              <InfoRow
                label={t("groupInfo.privacy")}
                value={t(`groupInfo.privacyValues.${displayGroup.privacy}`)}
              />
            </InfoSection>

            <InfoSection
              icon="stats-chart-outline"
              title={t("groupInfo.predictionType")}
            >
              <InfoRow
                label={t("groupInfo.predictionMode")}
                value={t(
                  `groupInfo.predictionModeLabels.${displayGroup.predictionMode}`,
                  t("groupInfo.predictionModeLabels.CorrectScore")
                )}
              />
              <InfoRow
                label={t("groupInfo.selectionMode")}
                value={t(
                  `groupInfo.selectionValues.${displayGroup.selectionMode ?? "games"}`
                )}
              />
            </InfoSection>

            {displayGroup.predictionMode === "CorrectScore" && (
              <InfoSection icon="trophy-outline" title={t("groupInfo.scoring")}>
                <InfoRow
                  label={t("groupInfo.exactScore")}
                  value={`${displayGroup.onTheNosePoints ?? 3} ${t("groupInfo.points")}`}
                />
                <InfoRow
                  label={t("groupInfo.correctDiff")}
                  value={`${displayGroup.correctDifferencePoints ?? 2} ${t("groupInfo.points")}`}
                />
                <InfoRow
                  label={t("groupInfo.correctOutcome")}
                  value={`${displayGroup.outcomePoints ?? 1} ${t("groupInfo.point")}`}
                />
              </InfoSection>
            )}

            {(displayGroup.koRoundMode === "ExtraTime" ||
              displayGroup.koRoundMode === "Penalties") && (
              <InfoSection
                icon="football-outline"
                title={t("groupInfo.koRounds")}
              >
                <InfoRow
                  label={t("groupInfo.countUntil")}
                  value={
                    displayGroup.koRoundMode === "Penalties"
                      ? t("groupInfo.penalties")
                      : t("groupInfo.extraTime")
                  }
                />
              </InfoSection>
            )}

            <InfoSection
              icon="document-text-outline"
              title={t("groupInfo.explanation")}
            >
              <AppText variant="body" color="secondary">
                {explanation}
              </AppText>
            </InfoSection>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
  },
  infoValue: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonSection: {
    marginBottom: 20,
  },
  skeletonTitle: {
    height: 20,
    width: 120,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonRow: {
    height: 16,
    width: "80%",
    borderRadius: 4,
    marginBottom: 8,
  },
});
