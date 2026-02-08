// features/groups/group-lobby/screens/GroupLobbyDraftScreen.tsx
// Draft state screen for group lobby.
// Shows editable name, status card, settings-style sections, and publish button.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  SettingsSection,
  SettingsRow,
  SettingsRowBottomSheet,
} from "@/features/settings";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { ApiGroupItem } from "@repo/types";

const NUDGE_WINDOW_OPTIONS = [30, 60, 120, 180] as const;
const MIN_SCORE = 1;
const MAX_SCORE = 10;

type PredictionMode = "result" | "3way";
type KORoundMode = "90min" | "extraTime" | "penalties";

function clampScore(value: number): number {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value));
}

import { PublishGroupButton } from "../components/PublishGroupButton";
import { DraftScoringContent } from "../components/DraftScoringContent";
import { useGroupLobbyState } from "../hooks/useGroupLobbyState";
import { useGroupLobbyActions } from "../hooks/useGroupLobbyActions";
import { useGroupDuration } from "../hooks/useGroupDuration";
import { useAutoSaveDraft } from "../hooks/useAutoSaveDraft";
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
  /** Called when publish is triggered (e.g. to show overlay) */
  onPublishStart?: () => void;
  /** Called when publish fails (e.g. to hide overlay and show error) */
  onPublishError?: () => void;
}

/**
 * Group Lobby Draft Screen
 *
 * Screen component for viewing and managing a group in draft status.
 * Uses SettingsSection / SettingsRow / SettingsRowPicker pattern.
 */
export function GroupLobbyDraftScreen({
  group,
  onRefresh,
  isCreator,
  onPublishStart,
  onPublishError,
}: GroupLobbyDraftScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();

  const {
    draftName,
    draftDescription,
    draftPrivacy,
    draftInviteAccess,
    setDraftName,
    setDraftDescription,
    setDraftPrivacy,
    setDraftInviteAccess,
  } = useGroupLobbyState(
    group.name,
    group.description ?? null,
    group.privacy,
    group.inviteAccess
  );

  const [predictionMode, setPredictionMode] = useState<PredictionMode>(() =>
    group.predictionMode === "MatchWinner" ? "3way" : "result"
  );

  const [koRoundMode, setKORoundMode] = useState<KORoundMode>(() => {
    if (group.koRoundMode === "ExtraTime") return "extraTime";
    if (group.koRoundMode === "Penalties") return "penalties";
    return "90min";
  });

  const [scoringValues, setScoringValues] = useState(() => ({
    onTheNose: group.onTheNosePoints ?? 3,
    goalDifference: group.correctDifferencePoints ?? 2,
    outcome: group.outcomePoints ?? 1,
  }));

  const [maxMembers, setMaxMembers] = useState(() => group.maxMembers ?? 50);
  const [nudgeEnabled, setNudgeEnabled] = useState(
    () => group.nudgeEnabled ?? true
  );
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(
    () => group.nudgeWindowMinutes ?? 60
  );

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

  const updateGroupMutation = useUpdateGroupMutation(group.id);
  const publishGroupMutation = usePublishGroupMutation(group.id);

  const fixtures = Array.isArray((group as any).fixtures)
    ? ((group as any).fixtures as FixtureItem[])
    : [];
  const duration = useGroupDuration(fixtures);

  const { handlePublish } = useGroupLobbyActions(
    publishGroupMutation,
    draftName,
    draftDescription,
    draftPrivacy,
    draftInviteAccess,
    scoringValues,
    predictionMode,
    koRoundMode,
    maxMembers,
    nudgeEnabled,
    nudgeWindowMinutes,
    t("lobby.defaultGroupName")
  );

  const handlePublishWithOverlay = useCallback(async () => {
    onPublishStart?.();
    try {
      await handlePublish();
    } catch {
      onPublishError?.();
    }
  }, [handlePublish, onPublishStart, onPublishError]);

  const isEditable =
    !publishGroupMutation.isPending && !updateGroupMutation.isPending;

  useAutoSaveDraft(
    group.id,
    {
      name: draftName,
      description: draftDescription,
      privacy: draftPrivacy,
      inviteAccess: draftInviteAccess,
      nudgeEnabled,
      nudgeWindowMinutes,
    },
    isEditable && isCreator
  );

  const handleViewAllGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  const predictionSheetRef =
    useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const scoringSheetRef =
    useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const koSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const maxMembersSheetRef =
    useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  const scoringValueDisplay =
    predictionMode === "result"
      ? `${clampScore(scoringValues.onTheNose)} · ${clampScore(scoringValues.goalDifference)} · ${clampScore(scoringValues.outcome)}`
      : `${clampScore(scoringValues.onTheNose)} · ${clampScore(scoringValues.outcome)}`;

  const durationSubtitle = duration
    ? duration.durationDays === 0
      ? t("lobby.gamesCount", { count: fixtures.length })
      : `${t("lobby.daysCount", { count: duration.durationDays })} · ${t("lobby.gamesCount", { count: fixtures.length })}`
    : undefined;

  const hasGames = fixtures.length > 0;
  const hasName = draftName.trim().length > 0;
  const stepsDone = (hasGames ? 1 : 0) + (hasName ? 1 : 0);
  const progressBannerText =
    stepsDone === 2
      ? t("lobby.readyToPublish")
      : stepsDone === 1
        ? hasGames
          ? t("lobby.progressOneStepName")
          : t("lobby.progressOneStepGames")
        : t("lobby.progressNoSteps");

  return (
    <View style={styles.container}>
      <Screen
        scroll
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
      >
        {/* Banner — separate from name/description card */}
        <View
          style={[styles.bannerRow, { borderBottomColor: theme.colors.border }]}
        >
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText variant="caption" style={styles.badgeText}>
              {t("lobby.draftBadge")}
            </AppText>
          </View>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.bannerSubtitle}
          >
            {progressBannerText}
          </AppText>
        </View>

        {/* Name + description in a card, visually separate from banner */}
        <SettingsSection title="">
          <View
            style={[styles.nameRow, { borderBottomColor: theme.colors.border }]}
          >
            {isCreator && isEditable ? (
              <TextInput
                style={[styles.nameInput, { color: theme.colors.textPrimary }]}
                value={draftName}
                onChangeText={setDraftName}
                placeholder={t("lobby.groupNamePlaceholder")}
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <AppText variant="body" style={styles.groupName}>
                {draftName}
              </AppText>
            )}
          </View>
          {(isCreator && isEditable) || draftDescription ? (
            <View style={styles.descriptionRow}>
              {isCreator && isEditable ? (
                <TextInput
                  style={[
                    styles.descriptionInput,
                    { color: theme.colors.textPrimary },
                  ]}
                  value={draftDescription}
                  onChangeText={setDraftDescription}
                  placeholder={t("lobby.descriptionPlaceholder")}
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              ) : (
                <AppText variant="body" color="secondary">
                  {draftDescription}
                </AppText>
              )}
            </View>
          ) : null}
        </SettingsSection>

        {/* GAMES */}
        <SettingsSection title={t("lobby.games")}>
          <SettingsRow
            type="value"
            icon="time-outline"
            label={t("lobby.groupDuration")}
            subtitle={durationSubtitle}
            value={
              duration
                ? `${formatDate(duration.startDate)} – ${formatDate(duration.endDate)}`
                : t("lobby.addGamesToSeeDuration")
            }
            isLast={false}
          />
          <SettingsRow
            type="navigation"
            icon="list-outline"
            label={t("lobby.viewAllGames")}
            subtitle={t("lobby.gamesCount", { count: fixtures.length })}
            onPress={handleViewAllGames}
            isLast
          />
        </SettingsSection>

        {/* PREDICTION RULES — creator only */}
        {isCreator && (
          <SettingsSection title={t("lobby.predictionRules")}>
            <SettingsRowBottomSheet.Row
              sheetRef={predictionSheetRef}
              icon="dice-outline"
              label={t("lobby.predictionMode")}
              valueDisplay={
                predictionMode === "result"
                  ? t("lobby.exactResult")
                  : t("lobby.matchWinner")
              }
              disabled={!isEditable}
            />
            <SettingsRowBottomSheet.Row
              sheetRef={scoringSheetRef}
              icon="trophy-outline"
              label={t("lobby.scoring")}
              valueDisplay={scoringValueDisplay}
              disabled={!isEditable}
              isLast
            />
          </SettingsSection>
        )}

        {/* ADVANCED — creator only (collapsed by default) */}
        {isCreator && (
          <SettingsSection
            title={t("lobby.advanced")}
            collapsible
            defaultExpanded={false}
          >
            <SettingsRowBottomSheet.Row
              sheetRef={koSheetRef}
              icon="flag-outline"
              label={t("lobby.koRoundMode")}
              valueDisplay={
                koRoundMode === "90min"
                  ? t("lobby.90min")
                  : koRoundMode === "extraTime"
                    ? t("lobby.extraTime")
                    : t("lobby.penalties")
              }
              disabled={!isEditable}
            />
            <SettingsRowBottomSheet.Row
              sheetRef={maxMembersSheetRef}
              icon="people-outline"
              label={t("lobby.maxMembers")}
              valueDisplay={String(maxMembers)}
              disabled={!isEditable}
            />
            <SettingsRow
              type="toggle"
              icon="notifications-outline"
              label={t("lobby.nudge")}
              subtitle={t("lobby.nudgeDescription")}
              value={nudgeEnabled}
              onValueChange={setNudgeEnabled}
              disabled={!isEditable}
              isLast={!nudgeEnabled}
            />
            {nudgeEnabled && (
              <View
                style={[
                  styles.nudgeWindowContainer,
                  { paddingHorizontal: theme.spacing.md },
                ]}
              >
                <View style={styles.nudgeWindowRow}>
                  <AppText variant="body" style={styles.nudgeLabel}>
                    {t("lobby.minutesBeforeKickoff")}
                  </AppText>
                </View>
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
            <SettingsRow
              type="toggle"
              icon="lock-closed-outline"
              label={t("lobby.private")}
              subtitle={
                draftPrivacy === "private"
                  ? t("lobby.privateDescription")
                  : t("lobby.publicDescription")
              }
              value={draftPrivacy === "private"}
              onValueChange={(v) => setDraftPrivacy(v ? "private" : "public")}
              disabled={!isEditable}
              isLast={draftPrivacy !== "private"}
            />
            {draftPrivacy === "private" && (
              <SettingsRow
                type="toggle"
                icon="link-outline"
                label={t("lobby.inviteSharing")}
                subtitle={
                  draftInviteAccess === "all"
                    ? t("lobby.allMembersCanShare")
                    : t("lobby.onlyAdminsCanShare")
                }
                value={draftInviteAccess === "all"}
                onValueChange={(v) =>
                  setDraftInviteAccess(v ? "all" : "admin_only")
                }
                disabled={!isEditable}
                isLast
              />
            )}
          </SettingsSection>
        )}

        {/* INFO */}
        <SettingsSection title={t("lobby.info")}>
          <SettingsRow
            type="value"
            iconComponent={
              <MaterialIcons
                name="date-range"
                size={18}
                color={theme.colors.primaryText}
              />
            }
            label={t("lobby.created")}
            value={formatDate(group.createdAt)}
            isLast
          />
        </SettingsSection>
      </Screen>

      {isCreator && (
        <>
          <SettingsRowBottomSheet.Sheet<PredictionMode>
            sheetRef={predictionSheetRef}
            title={t("lobby.predictionMode")}
            options={[
              { value: "result", label: t("lobby.exactResult") },
              { value: "3way", label: t("lobby.matchWinner") },
            ]}
            value={predictionMode}
            onValueChange={setPredictionMode}
          />
          <SettingsRowBottomSheet.Sheet
            sheetRef={scoringSheetRef}
            title={t("lobby.scoring")}
            children={
              <DraftScoringContent
                values={scoringValues}
                predictionMode={predictionMode}
                onChange={setScoringValues}
                disabled={!isEditable}
              />
            }
          />
          <SettingsRowBottomSheet.Sheet<KORoundMode>
            sheetRef={koSheetRef}
            title={t("lobby.koRoundMode")}
            options={[
              { value: "90min", label: t("lobby.90min") },
              { value: "extraTime", label: t("lobby.extraTime") },
              { value: "penalties", label: t("lobby.penalties") },
            ]}
            value={koRoundMode}
            onValueChange={setKORoundMode}
          />
          <SettingsRowBottomSheet.Sheet
            sheetRef={maxMembersSheetRef}
            title={t("lobby.maxMembers")}
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "30", label: "30" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            value={String(maxMembers)}
            onValueChange={(v) => setMaxMembers(Number(v))}
          />
        </>
      )}

      {isCreator && (
        <PublishGroupButton
          onPress={handlePublishWithOverlay}
          isPending={publishGroupMutation.isPending}
          disabled={publishGroupMutation.isPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: "600",
  },
  bannerSubtitle: {
    flex: 1,
    lineHeight: 20,
  },
  nameRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  nameInput: {
    fontSize: 16,
    padding: 0,
  },
  groupName: {
    fontWeight: "500",
  },
  descriptionRow: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  descriptionInput: {
    minHeight: 72,
    padding: 0,
    fontSize: 16,
    textAlignVertical: "top",
  },
  nudgeWindowContainer: {
    paddingVertical: 12,
  },
  nudgeWindowRow: {
    marginBottom: 8,
  },
  nudgeLabel: {
    fontWeight: "500",
  },
  nudgeWindowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  nudgeWindowChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
