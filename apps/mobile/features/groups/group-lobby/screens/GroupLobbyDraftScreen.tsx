// features/groups/group-lobby/screens/GroupLobbyDraftScreen.tsx
// Draft state screen for group lobby.
// Shows editable name, status card, privacy settings, and publish button.

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";

const NUDGE_WINDOW_OPTIONS = [30, 60, 120, 180] as const;
import { GroupLobbyNameHeader } from "../components/GroupLobbyNameHeader";
import { GroupLobbyStatusCard } from "../components/GroupLobbyStatusCard";
import { GroupLobbyScoringSection } from "../components/GroupLobbyScoringSection";
import { GroupLobbyMaxMembersSection } from "../components/GroupLobbyMaxMembersSection";
import {
  PredictionModeSelector,
  type PredictionMode,
} from "../components/PredictionModeSelector";
import {
  KORoundModeSelector,
  type KORoundMode,
} from "../components/KORoundModeSelector";
import { GroupLobbyFixturesSection } from "../components/GroupLobbyFixturesSection";
import { GroupLobbyPrivacySection } from "../components/GroupLobbyPrivacySection";
import { GroupLobbyInviteAccessSection } from "../components/GroupLobbyInviteAccessSection";
import { GroupLobbyMetaSection } from "../components/GroupLobbyMetaSection";
import { PublishGroupButton } from "../components/PublishGroupButton";
import { useGroupLobbyState } from "../hooks/useGroupLobbyState";
import { useGroupLobbyActions } from "../hooks/useGroupLobbyActions";
import { useGroupDuration } from "../hooks/useGroupDuration";
import type { FixtureItem } from "../types";
import { formatDate } from "@/utils/date";
import {
  usePublishGroupMutation,
  useUpdateGroupMutation,
} from "@/domains/groups";

interface GroupLobbyDraftScreenProps {
  /**
   * Group data (includes fixtures when fetched with includeFixtures)
   */
  group: ApiGroupItem;
  /**
   * Callback to refresh all data
   */
  onRefresh: () => Promise<void>;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
}

/**
 * Group Lobby Draft Screen
 *
 * Screen component for viewing and managing a group in draft status.
 * Shows editable name, status card, privacy settings, and publish button.
 */
export function GroupLobbyDraftScreen({
  group,
  onRefresh,
  isCreator,
}: GroupLobbyDraftScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();

  // Manage local state for draft name, privacy, and invite access
  const {
    draftName,
    draftPrivacy,
    draftInviteAccess,
    setDraftName,
    setDraftPrivacy,
    setDraftInviteAccess,
  } = useGroupLobbyState(group.name, group.privacy, group.inviteAccess);

  // Manage local state for prediction mode, initialized from group
  const [predictionMode, setPredictionMode] = useState<PredictionMode>(() =>
    group.predictionMode === "MatchWinner" ? "3way" : "result"
  );

  // Manage local state for KO round mode, initialized from group
  const [koRoundMode, setKORoundMode] = useState<KORoundMode>(() => {
    if (group.koRoundMode === "ExtraTime") return "extraTime";
    if (group.koRoundMode === "Penalties") return "penalties";
    return "90min";
  });

  // Manage local state for scoring values, initialized from group
  const [scoringValues, setScoringValues] = useState(() => ({
    onTheNose: group.onTheNosePoints ?? 3,
    goalDifference: group.correctDifferencePoints ?? 2,
    outcome: group.outcomePoints ?? 1,
  }));

  // Manage local state for max members, initialized from group
  const [maxMembers, setMaxMembers] = useState(() => group.maxMembers ?? 50);

  // Manage local state for nudge settings, initialized from group
  const [nudgeEnabled, setNudgeEnabled] = useState(
    () => group.nudgeEnabled ?? true
  );
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(
    () => group.nudgeWindowMinutes ?? 60
  );

  const { theme } = useTheme();

  // Sync state when group changes (e.g. after refresh)
  useEffect(() => {
    setPredictionMode(
      group.predictionMode === "MatchWinner" ? "3way" : "result"
    );
    setKORoundMode(
      group.koRoundMode === "ExtraTime"
        ? "extraTime"
        : group.koRoundMode === "Penalties"
          ? "penalties"
          : "90min"
    );
    setScoringValues({
      onTheNose: group.onTheNosePoints ?? 3,
      goalDifference: group.correctDifferencePoints ?? 2,
      outcome: group.outcomePoints ?? 1,
    });
    setMaxMembers(group.maxMembers ?? 50);
    setNudgeEnabled(group.nudgeEnabled ?? true);
    setNudgeWindowMinutes(group.nudgeWindowMinutes ?? 60);
  }, [
    group.predictionMode,
    group.koRoundMode,
    group.onTheNosePoints,
    group.correctDifferencePoints,
    group.outcomePoints,
    group.maxMembers,
    group.nudgeEnabled,
    group.nudgeWindowMinutes,
  ]);

  // Local mutations - tied to this group
  const updateGroupMutation = useUpdateGroupMutation(group.id);
  const publishGroupMutation = usePublishGroupMutation(group.id);

  // Derive fixtures from group.fixtures
  const fixtures = Array.isArray((group as any).fixtures)
    ? ((group as any).fixtures as FixtureItem[])
    : [];

  const duration = useGroupDuration(fixtures);

  // Handle publish action
  const { handlePublish } = useGroupLobbyActions(
    publishGroupMutation,
    draftName,
    draftPrivacy,
    draftInviteAccess,
    scoringValues,
    predictionMode,
    koRoundMode,
    maxMembers
  );

  // Determine if name/privacy inputs should be editable
  const isEditable =
    !publishGroupMutation.isPending && !updateGroupMutation.isPending;

  // Handler for navigating to view all games
  const handleViewAllGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  return (
    <View style={styles.container}>
      <Screen
        scroll
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
      >
        {/* Status Section - Draft Badge */}
        <GroupLobbyStatusCard status={group.status} isCreator={isCreator} />

        {/* Header Section - Group Name (Editable) */}
        <GroupLobbyNameHeader
          name={draftName}
          onChange={setDraftName}
          editable={isEditable}
          isCreator={isCreator}
        />

        {/* Section: Games */}
        <AppText variant="subtitle" style={styles.sectionTitle}>
          {t("lobby.games")}
        </AppText>
        <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          onViewAll={handleViewAllGames}
        />

        {/* Section: Group Duration */}
        <AppText variant="subtitle" style={styles.sectionTitle}>
          {t("lobby.groupDuration")}
        </AppText>
        {duration ? (
          <>
            <AppText
              variant="body"
              color="secondary"
              style={styles.durationLine}
            >
              {formatDate(duration.startDate)} – {formatDate(duration.endDate)}
            </AppText>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.durationLine}
            >
              {duration.durationDays === 0
                ? t("lobby.gamesCount", { count: fixtures.length })
                : `${t("lobby.daysCount", { count: duration.durationDays })} · ${t("lobby.gamesCount", { count: fixtures.length })}`}
            </AppText>
          </>
        ) : (
          <AppText
            variant="caption"
            color="secondary"
            style={styles.durationLine}
          >
            {t("lobby.addGamesToSeeDuration")}
          </AppText>
        )}

        {/* Section: Prediction rules */}
        {isCreator && (
          <>
            <AppText variant="subtitle" style={styles.sectionTitle}>
              {t("lobby.predictionRules")}
            </AppText>
            <PredictionModeSelector
              value={predictionMode}
              onChange={setPredictionMode}
              disabled={!isEditable}
            />
            <GroupLobbyScoringSection
              initialOnTheNose={scoringValues.onTheNose}
              initialGoalDifference={scoringValues.goalDifference}
              initialOutcome={scoringValues.outcome}
              predictionMode={predictionMode}
              onChange={(values) => setScoringValues(values)}
              disabled={!isEditable}
            />
            <KORoundModeSelector
              value={koRoundMode}
              onChange={setKORoundMode}
              disabled={!isEditable}
            />
            <GroupLobbyMaxMembersSection
              initialMaxMembers={maxMembers}
              onChange={setMaxMembers}
              disabled={!isEditable}
            />
            <AppText variant="subtitle" style={styles.sectionTitle}>
              {t("lobby.nudge")}
            </AppText>
            <View style={styles.nudgeRow}>
              <AppText variant="body" style={styles.nudgeLabel}>
                {t("lobby.nudgeDescription")}
              </AppText>
              <Switch
                value={nudgeEnabled}
                onValueChange={setNudgeEnabled}
                disabled={!isEditable}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={
                  nudgeEnabled ? theme.colors.primaryText : theme.colors.surface
                }
              />
            </View>
            {nudgeEnabled && (
              <View style={styles.nudgeWindowRow}>
                <AppText variant="body" style={styles.nudgeLabel}>
                  {t("lobby.minutesBeforeKickoff")}
                </AppText>
                <View style={styles.nudgeWindowChips}>
                  {NUDGE_WINDOW_OPTIONS.map((min) => (
                    <Pressable
                      key={min}
                      onPress={() => setNudgeWindowMinutes(min)}
                      disabled={!isEditable}
                      style={[
                        styles.nudgeWindowChip,
                        {
                          backgroundColor:
                            nudgeWindowMinutes === min
                              ? theme.colors.primary
                              : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="body"
                        style={{
                          color:
                            nudgeWindowMinutes === min
                              ? theme.colors.primaryText
                              : theme.colors.textPrimary,
                        }}
                      >
                        {min}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Section: Privacy & invite */}
        <AppText variant="subtitle" style={styles.sectionTitle}>
          {t("lobby.privacyAndInvite")}
        </AppText>
        <GroupLobbyPrivacySection
          privacy={draftPrivacy}
          onChange={setDraftPrivacy}
          disabled={!isEditable}
          isCreator={isCreator}
          status={group.status}
        />

        {/* Invite Sharing Section (only when private - public groups don't need invite restriction) */}
        {draftPrivacy === "private" && (
          <GroupLobbyInviteAccessSection
            inviteAccess={draftInviteAccess}
            onChange={setDraftInviteAccess}
            disabled={!isEditable}
            isCreator={isCreator}
            status={group.status}
          />
        )}

        {/* Meta Section */}
        <GroupLobbyMetaSection createdAt={group.createdAt} />
      </Screen>

      {/* Floating Action Buttons (Only for creators) */}
      {isCreator && (
        <>
          <PublishGroupButton
            onPress={handlePublish}
            isPending={publishGroupMutation.isPending}
            disabled={publishGroupMutation.isPending || !draftName.trim()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 100, // Space for floating button
  },
  sectionTitle: {
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
  },
  durationLine: {
    marginBottom: 4,
  },
  nudgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  nudgeLabel: {
    flex: 1,
    marginEnd: 16,
  },
  nudgeWindowRow: {
    marginBottom: 16,
  },
  nudgeWindowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  nudgeWindowChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
