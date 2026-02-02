// features/groups/group-lobby/components/GroupSettingsModal.tsx
// Modal component for group settings.

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useUpdateGroupMutation } from "@/domains/groups";
import type { ApiGroupItem, ApiInviteAccess } from "@repo/types";

const NUDGE_WINDOW_OPTIONS = [30, 60, 120, 180] as const;

interface GroupSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Group data for settings (invite access, etc.). Required to show invite toggle. */
  group?: ApiGroupItem;
  /** Whether current user is the group creator. Invite access toggle only shown when true. */
  isCreator?: boolean;
}

/**
 * GroupSettingsModal
 *
 * Modal component for displaying and managing group settings.
 * Shows invite access toggle for private groups when user is the creator.
 */
export function GroupSettingsModal({
  visible,
  onClose,
  group,
  isCreator = false,
}: GroupSettingsModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [inviteAccess, setInviteAccess] = useState<ApiInviteAccess>("all");
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(60);

  const updateGroupMutation = useUpdateGroupMutation(group?.id ?? null);

  useEffect(() => {
    if (group?.inviteAccess !== undefined) {
      setInviteAccess(group.inviteAccess);
    } else {
      setInviteAccess("all");
    }
  }, [group?.inviteAccess]);

  useEffect(() => {
    if (group?.nudgeEnabled !== undefined) {
      setNudgeEnabled(group.nudgeEnabled);
    } else {
      setNudgeEnabled(true);
    }
    if (group?.nudgeWindowMinutes !== undefined) {
      setNudgeWindowMinutes(group.nudgeWindowMinutes);
    } else {
      setNudgeWindowMinutes(60);
    }
  }, [group?.nudgeEnabled, group?.nudgeWindowMinutes]);

  const showInviteToggle =
    isCreator && group?.privacy === "private" && group?.id != null;
  const showNudgeSection = isCreator && group?.id != null;
  // Same convention as Draft (GroupLobbyInviteAccessSection): ON = all can share, OFF = admin only
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="close"
              size={32}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>
            Group Settings
          </AppText>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.content}>
          {showInviteToggle && (
            <View style={styles.inviteRow}>
              <View style={styles.inviteLabelContainer}>
                <AppText variant="body" style={styles.inviteLabel}>
                  {t("lobby.inviteSharing")}
                </AppText>
                <AppText variant="caption" color="secondary" style={styles.inviteHelper}>
                  {switchOn
                    ? t("lobby.allMembersCanShare")
                    : t("lobby.onlyAdminsCanShare")}
                </AppText>
              </View>
              <Switch
                value={switchOn}
                onValueChange={handleInviteAccessChange}
                disabled={updateGroupMutation.isPending}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={
                  switchOn ? theme.colors.primaryText : theme.colors.surface
                }
              />
            </View>
          )}
          {showNudgeSection && (
            <>
              <View style={styles.inviteRow}>
                <View style={styles.inviteLabelContainer}>
                  <AppText variant="body" style={styles.inviteLabel}>
                    Nudge
                  </AppText>
                  <AppText variant="caption" color="secondary" style={styles.inviteHelper}>
                    Allow members to nudge each other for upcoming games
                  </AppText>
                </View>
                <Switch
                  value={nudgeEnabled}
                  onValueChange={handleNudgeEnabledChange}
                  disabled={updateGroupMutation.isPending}
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
                  <AppText variant="body" style={styles.inviteLabel}>
                    Minutes before kickoff
                  </AppText>
                  <View style={styles.nudgeWindowChips}>
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
                                : theme.colors.text,
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inviteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  inviteLabelContainer: {
    flex: 1,
    marginEnd: 16,
  },
  inviteLabel: {
    fontWeight: "600",
    marginBottom: 4,
  },
  inviteHelper: {
    marginTop: 0,
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
