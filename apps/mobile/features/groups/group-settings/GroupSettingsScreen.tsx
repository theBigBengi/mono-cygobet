// features/groups/group-settings/GroupSettingsScreen.tsx
// Screen for group settings with proper design.

import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useGroupQuery, useUpdateGroupMutation } from "@/domains/groups";
import {
  EditNameSheet,
  EditDescriptionSheet,
  EditRulesSheet,
  DangerZoneSection,
} from "./components";
import { useAuth } from "@/lib/auth/useAuth";
import {
  SettingsSection,
  SettingsRow,
  SettingsRowBottomSheet,
} from "@/features/settings";
import type { ApiInviteAccess, ApiGroupPrivacy } from "@repo/types";

const NUDGE_WINDOW_OPTIONS = [30, 60, 120, 180] as const;

interface GroupSettingsScreenProps {
  groupId: number | null;
}

export function GroupSettingsScreen({ groupId }: GroupSettingsScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: groupData } = useGroupQuery(groupId);
  const group = groupData?.data;
  const isCreator = group?.creatorId === user?.id;

  // Bottom sheet refs
  const editNameSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const editDescSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const privacySheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const rulesSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  // Check if rules are locked
  const hasFirstGameStarted = group?.firstGame != null && group?.firstGame?.state !== "NS";

  const [inviteAccess, setInviteAccess] = useState<ApiInviteAccess>("all");
  const [privacy, setPrivacy] = useState<ApiGroupPrivacy>("private");
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(60);

  const updateGroupMutation = useUpdateGroupMutation(groupId);

  useEffect(() => {
    if (group?.inviteAccess !== undefined) {
      setInviteAccess(group.inviteAccess);
    }
  }, [group?.inviteAccess]);

  useEffect(() => {
    if (group?.privacy !== undefined) {
      setPrivacy(group.privacy);
    }
  }, [group?.privacy]);

  useEffect(() => {
    if (group?.nudgeEnabled !== undefined) {
      setNudgeEnabled(group.nudgeEnabled);
    }
    if (group?.nudgeWindowMinutes !== undefined) {
      setNudgeWindowMinutes(group.nudgeWindowMinutes);
    }
  }, [group?.nudgeEnabled, group?.nudgeWindowMinutes]);

  const showInviteToggle = isCreator && group?.privacy === "private";
  const showNudgeSection = isCreator;
  const switchOn = inviteAccess === "all";

  const handleInviteAccessChange = (value: boolean) => {
    const newValue: ApiInviteAccess = value ? "all" : "admin_only";
    setInviteAccess(newValue);
    updateGroupMutation.mutate({ inviteAccess: newValue });
  };

  const handleNudgeEnabledChange = (value: boolean) => {
    setNudgeEnabled(value);
    updateGroupMutation.mutate({ nudgeEnabled: value, nudgeWindowMinutes });
  };

  const handlePrivacyChange = (value: ApiGroupPrivacy) => {
    setPrivacy(value);
    updateGroupMutation.mutate({ privacy: value });
  };

  const handleNudgeWindowChange = (minutes: number) => {
    setNudgeWindowMinutes(minutes);
    updateGroupMutation.mutate({ nudgeEnabled, nudgeWindowMinutes: minutes });
  };

  const handleViewMembers = () => {
    if (groupId != null) {
      router.push(`/groups/${groupId}/members` as any);
    }
  };

  if (!group) {
    return null;
  }

  return (
    <>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <SettingsSection
          title={t("groupSettings.general" as Parameters<typeof t>[0])}
        >
          <SettingsRow
            type="navigation"
            icon="people-outline"
            label={t("lobby.members")}
            subtitle={t("lobby.viewGroupMembers")}
            onPress={handleViewMembers}
            isLast={!isCreator && !showInviteToggle}
          />
          {isCreator && (
            <>
              <SettingsRow
                type="navigation"
                icon="create-outline"
                label={t("groupSettings.editName" as Parameters<typeof t>[0])}
                onPress={() => editNameSheetRef.current?.present()}
                isLast={false}
              />
              <SettingsRow
                type="navigation"
                icon="document-text-outline"
                label={t(
                  "groupSettings.editDescription" as Parameters<typeof t>[0]
                )}
                onPress={() => editDescSheetRef.current?.present()}
                isLast={false}
              />
              <SettingsRowBottomSheet.Row
                sheetRef={privacySheetRef}
                icon="lock-closed-outline"
                label={t(
                  "groupSettings.changePrivacy" as Parameters<typeof t>[0]
                )}
                valueDisplay={privacy === "private" ? t("lobby.private") : t("pool.public")}
                isLast={!showInviteToggle}
              />
            </>
          )}
          {showInviteToggle && (
            <SettingsRow
              type="toggle"
              icon="link-outline"
              label={t("lobby.inviteSharing")}
              subtitle={
                switchOn
                  ? t("lobby.allMembersCanShare")
                  : t("lobby.onlyAdminsCanShare")
              }
              value={switchOn}
              onValueChange={handleInviteAccessChange}
              disabled={updateGroupMutation.isPending}
              isLast
            />
          )}
        </SettingsSection>

        {isCreator && (
          <SettingsSection
            title={t("groupSettings.editRules" as Parameters<typeof t>[0])}
          >
            <SettingsRowBottomSheet.Row
              sheetRef={rulesSheetRef}
              icon="trophy-outline"
              label={t("groupSettings.scoringPoints" as Parameters<typeof t>[0])}
              valueDisplay={`${group.onTheNosePoints ?? 3} / ${group.correctDifferencePoints ?? 2} / ${group.outcomePoints ?? 1}`}
              subtitle={
                hasFirstGameStarted
                  ? t("groupSettings.rulesLocked" as Parameters<typeof t>[0])
                  : undefined
              }
              disabled={hasFirstGameStarted}
              isLast
            />
          </SettingsSection>
        )}

        {/* Notifications Section - Creator only */}
        {showNudgeSection && (
          <SettingsSection
            title={t("groupSettings.notifications" as Parameters<typeof t>[0])}
          >
            <SettingsRow
              type="toggle"
              icon="notifications-outline"
              label={t("lobby.nudge")}
              subtitle={t("lobby.nudgeDescription")}
              value={nudgeEnabled}
              onValueChange={handleNudgeEnabledChange}
              disabled={updateGroupMutation.isPending}
              isLast={!nudgeEnabled}
            />
            {nudgeEnabled && (
              <View style={styles.nudgeWindowContainer}>
                <View
                  style={[
                    styles.nudgeWindowRow,
                    { paddingHorizontal: theme.spacing.md },
                  ]}
                >
                  <AppText variant="body" style={styles.nudgeLabel}>
                    {t("lobby.minutesBeforeKickoff")}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.nudgeWindowChips,
                    { paddingHorizontal: theme.spacing.md },
                  ]}
                >
                  {NUDGE_WINDOW_OPTIONS.map((min) => (
                    <Pressable
                      key={min}
                      onPress={() => handleNudgeWindowChange(min)}
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
          </SettingsSection>
        )}
        <DangerZoneSection groupId={groupId} isCreator={!!isCreator} />
      </ScrollView>

      {/* Bottom Sheets */}
      <EditNameSheet
        sheetRef={editNameSheetRef}
        group={group}
        updateGroupMutation={updateGroupMutation}
      />
      <EditDescriptionSheet
        sheetRef={editDescSheetRef}
        group={group}
        updateGroupMutation={updateGroupMutation}
      />
      <SettingsRowBottomSheet.Sheet
        sheetRef={privacySheetRef}
        title={t("groupSettings.changePrivacy" as Parameters<typeof t>[0])}
        options={[
          { value: "private" as const, label: t("lobby.private") },
          { value: "public" as const, label: t("pool.public") },
        ]}
        value={privacy}
        onValueChange={handlePrivacyChange}
      />
      {!hasFirstGameStarted && (
        <EditRulesSheet
          sheetRef={rulesSheetRef}
          group={group}
          updateGroupMutation={updateGroupMutation}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
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
