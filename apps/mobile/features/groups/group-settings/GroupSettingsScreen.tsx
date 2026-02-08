// features/groups/group-settings/GroupSettingsScreen.tsx
// Screen for group settings with proper design.

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useGroupQuery, useUpdateGroupMutation } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { SettingsSection, SettingsRow } from "@/features/settings";
import { NudgeWindowPicker } from "@/features/groups/group-lobby/components/NudgeWindowPicker";
import type { ApiInviteAccess } from "@repo/types";

export function GroupSettingsScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const groupId = id ? Number(id) : null;
  const { data: groupData } = useGroupQuery(groupId);
  const group = groupData?.data;
  const isCreator = group?.creatorId === user?.id;

  const [inviteAccess, setInviteAccess] = useState<ApiInviteAccess>("all");
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(60);

  const updateGroupMutation = useUpdateGroupMutation(groupId);

  useEffect(() => {
    if (group?.inviteAccess !== undefined) {
      setInviteAccess(group.inviteAccess);
    }
  }, [group?.inviteAccess]);

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
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("lobby.groupSettings")}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <Screen scroll contentContainerStyle={styles.content}>
        <SettingsSection title={t("groupSettings.general")}>
          <SettingsRow
            type="navigation"
            icon="people-outline"
            label={t("lobby.members")}
            subtitle={t("lobby.viewGroupMembers")}
            onPress={handleViewMembers}
            isLast={!showInviteToggle}
          />
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

        {showNudgeSection && (
          <SettingsSection title={t("groupSettings.notifications")}>
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
              <NudgeWindowPicker
                value={nudgeWindowMinutes}
                onValueChange={handleNudgeWindowChange}
                disabled={updateGroupMutation.isPending}
              />
            )}
          </SettingsSection>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
