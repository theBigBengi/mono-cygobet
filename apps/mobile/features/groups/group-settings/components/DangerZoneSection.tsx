// features/groups/group-settings/components/DangerZoneSection.tsx
// Danger zone: Leave Group (members), Delete Group (creator).

import React from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
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
  const { theme } = useTheme();
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

  if (!showLeave && !showDelete) return null;

  return (
    <>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
        {t("groupSettings.dangerZone" as Parameters<typeof t>[0])}
      </Text>

      {showLeave && (
        <Pressable
          onPress={handleLeaveGroup}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.danger }]}>
            {t("groupSettings.leaveGroup")}
          </Text>
        </Pressable>
      )}

      {showDelete && (
        <Pressable
          onPress={handleDeleteGroup}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.danger }]}>
            {t("groupSettings.deleteGroup")}
          </Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 15,
  },
});
