// features/groups/group-settings/components/DangerZoneSection.tsx
// Danger zone: Leave Group (members), Delete Group (creator).

import React from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { SettingsSection, SettingsRow } from "@/features/settings";
import {
  useDeleteGroupMutation,
  useLeaveGroupMutation,
} from "@/domains/groups";

interface DangerZoneSectionProps {
  groupId: number | null;
  isCreator: boolean;
}

export function DangerZoneSection({
  groupId,
  isCreator,
}: DangerZoneSectionProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const deleteGroupMutation = useDeleteGroupMutation(groupId);
  const leaveGroupMutation = useLeaveGroupMutation(groupId);

  const handleDeleteGroup = () => {
    Alert.alert(
      t("groupSettings.deleteGroup"),
      t("groupSettings.deleteGroupConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("groupSettings.deleteGroup"),
          style: "destructive",
          onPress: () => {
            deleteGroupMutation.mutate(undefined, {
              onSuccess: () => {
                router.replace("/(tabs)/groups" as any);
              },
              onError: (error) => {
                Alert.alert(
                  t("errors.error"),
                  error?.message || t("groups.deleteGroupDraftFailed")
                );
              },
            });
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    if (isCreator) {
      Alert.alert(
        t("groupSettings.leaveGroup"),
        t("groupSettings.cannotLeaveAsCreator")
      );
      return;
    }
    Alert.alert(
      t("groupSettings.leaveGroup"),
      t("groupSettings.leaveGroupConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("groupSettings.leaveGroup"),
          style: "destructive",
          onPress: () => {
            leaveGroupMutation.mutate(undefined, {
              onError: (error) => {
                Alert.alert(
                  t("errors.error"),
                  error?.message || t("groups.failedJoinGroup")
                );
              },
            });
          },
        },
      ]
    );
  };

  const showLeave = !isCreator && groupId != null;
  const showDelete = isCreator && groupId != null;

  if (!showLeave && !showDelete) {
    return null;
  }

  const rows: React.ReactNode[] = [];
  if (showLeave) {
    rows.push(
      <SettingsRow
        key="leave"
        type="navigation"
        icon="exit-outline"
        label={t("groupSettings.leaveGroup")}
        subtitle={t("groupSettings.leaveGroupDescription")}
        onPress={handleLeaveGroup}
        isLast={!showDelete}
      />
    );
  }
  if (showDelete) {
    rows.push(
      <SettingsRow
        key="delete"
        type="navigation"
        icon="trash-outline"
        label={t("groupSettings.deleteGroup")}
        subtitle={t("groupSettings.deleteGroupDescription")}
        onPress={handleDeleteGroup}
        isLast
      />
    );
  }

  return (
    <SettingsSection
      title={t("groupSettings.dangerZone" as Parameters<typeof t>[0])}
    >
      {rows}
    </SettingsSection>
  );
}
