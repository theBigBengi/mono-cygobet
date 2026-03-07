// features/groups/group-settings/GroupSettingsScreen.tsx
// Screen for group settings — flat design matching app style.

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { useGroupQuery, useUpdateGroupMutation } from "@/domains/groups";
import {
  EditRulesSheet,
  DangerZoneSection,
} from "./components";
import { useAuth } from "@/lib/auth/useAuth";
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
  const privacySheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const rulesSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const nudgeSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  // Check if rules are locked
  const hasFirstGameStarted = group?.firstGame != null && group?.firstGame?.state !== "NS";

  const [inviteAccess, setInviteAccess] = useState<ApiInviteAccess>("all");
  const [privacy, setPrivacy] = useState<ApiGroupPrivacy>("private");
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(60);

  const updateGroupMutation = useUpdateGroupMutation(groupId);

  useEffect(() => {
    if (group?.inviteAccess !== undefined) setInviteAccess(group.inviteAccess);
  }, [group?.inviteAccess]);

  useEffect(() => {
    if (group?.privacy !== undefined) setPrivacy(group.privacy);
  }, [group?.privacy]);

  useEffect(() => {
    if (group?.nudgeEnabled !== undefined) setNudgeEnabled(group.nudgeEnabled);
    if (group?.nudgeWindowMinutes !== undefined) setNudgeWindowMinutes(group.nudgeWindowMinutes);
  }, [group?.nudgeEnabled, group?.nudgeWindowMinutes]);

  const showInviteToggle = isCreator && group?.privacy === "private";
  const showNudgeSection = isCreator;
  const switchOn = inviteAccess === "all";

  // Draft state for nudge sheet
  const [draftNudgeEnabled, setDraftNudgeEnabled] = useState(nudgeEnabled);
  const [draftNudgeMinutes, setDraftNudgeMinutes] = useState(nudgeWindowMinutes);

  const handleOpenNudgeSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftNudgeEnabled(nudgeEnabled);
    setDraftNudgeMinutes(nudgeWindowMinutes);
    nudgeSheetRef.current?.present();
  }, [nudgeEnabled, nudgeWindowMinutes]);

  const handleNudgeDone = useCallback(() => {
    setNudgeEnabled(draftNudgeEnabled);
    setNudgeWindowMinutes(draftNudgeMinutes);
    updateGroupMutation.mutate({
      nudgeEnabled: draftNudgeEnabled,
      nudgeWindowMinutes: draftNudgeMinutes,
    });
    nudgeSheetRef.current?.dismiss();
  }, [draftNudgeEnabled, draftNudgeMinutes, updateGroupMutation]);

  const nudgeUnchanged =
    draftNudgeEnabled === nudgeEnabled && draftNudgeMinutes === nudgeWindowMinutes;

  const handleInviteAccessChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue: ApiInviteAccess = switchOn ? "admin_only" : "all";
    setInviteAccess(newValue);
    updateGroupMutation.mutate({ inviteAccess: newValue });
  };

  const handlePrivacyChange = (value: ApiGroupPrivacy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrivacy(value);
    updateGroupMutation.mutate({ privacy: value });
  };

  const handleViewMembers = () => {
    if (groupId != null) router.push({ pathname: '/groups/[id]/members', params: { id: String(groupId) } });
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  if (!group) return null;

  return (
    <>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t("groupSettings.general" as Parameters<typeof t>[0])}
        </Text>

        <Pressable
          onPress={handleViewMembers}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
            {t("lobby.members")}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
        </Pressable>

        {isCreator && (
          <>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                privacySheetRef.current?.present();
              }}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                {t("groupSettings.changePrivacy" as Parameters<typeof t>[0])}
              </Text>
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
                  {privacy === "private" ? t("lobby.private") : t("pool.public")}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>
          </>
        )}

        {showInviteToggle && (
          <Pressable
            onPress={handleInviteAccessChange}
            disabled={updateGroupMutation.isPending}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                {t("lobby.inviteSharing")}
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                {switchOn ? t("lobby.allMembersCanShare") : t("lobby.onlyAdminsCanShare")}
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                { backgroundColor: switchOn ? theme.colors.primary : theme.colors.textSecondary + "30" },
              ]}
            >
              <View style={[styles.toggleKnob, { alignSelf: switchOn ? "flex-end" : "flex-start" }]} />
            </View>
          </Pressable>
        )}

        {/* Edit Rules Section - Creator only */}
        {isCreator && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              {t("groupSettings.editRules" as Parameters<typeof t>[0])}
            </Text>

            <Pressable
              onPress={() => !hasFirstGameStarted && rulesSheetRef.current?.present()}
              disabled={hasFirstGameStarted}
              style={({ pressed }) => [
                styles.row,
                { opacity: hasFirstGameStarted ? 0.5 : pressed ? 0.6 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  {t("groupSettings.scoringPoints" as Parameters<typeof t>[0])}
                </Text>
                {hasFirstGameStarted && (
                  <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                    {t("groupSettings.rulesLocked" as Parameters<typeof t>[0])}
                  </Text>
                )}
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
                  {group.onTheNosePoints ?? 3} / {group.correctDifferencePoints ?? 2} / {group.outcomePoints ?? 1}
                </Text>
                {!hasFirstGameStarted && (
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
                )}
              </View>
            </Pressable>
          </>
        )}

        {/* Notifications Section - Creator only */}
        {showNudgeSection && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              {t("groupSettings.notifications" as Parameters<typeof t>[0])}
            </Text>

            <Pressable
              onPress={handleOpenNudgeSheet}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                {t("lobby.nudge")}
              </Text>
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
                  {nudgeEnabled ? `${nudgeWindowMinutes} min` : "Off"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>
          </>
        )}

        {/* Danger Zone */}
        <DangerZoneSection groupId={groupId} isCreator={!!isCreator} />
      </ScrollView>

      {/* Privacy Picker */}
      <BottomSheetModal
        ref={privacySheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text
            style={[
              styles.sheetTitle,
              { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" },
            ]}
          >
            {t("groupSettings.changePrivacy" as Parameters<typeof t>[0])}
          </Text>
          {([
            { value: "private" as const, label: t("lobby.private") },
            { value: "public" as const, label: t("pool.public") },
          ]).map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => handlePrivacyChange(opt.value)}
              style={({ pressed }) => [styles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>
                {opt.label}
              </Text>
              <Ionicons
                name={opt.value === privacy ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={opt.value === privacy ? theme.colors.primary : theme.colors.textSecondary}
              />
            </Pressable>
          ))}
          <Pressable
            onPress={() => privacySheetRef.current?.dismiss()}
            style={({ pressed }) => [
              styles.sheetDoneBtn,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Nudge Sheet */}
      <BottomSheetModal
        ref={nudgeSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.textPrimary + "10", paddingBottom: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", textAlign: "center", color: theme.colors.textPrimary }}>
              {t("lobby.nudge")}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 }}>
              {t("lobby.nudgeDescription")}
            </Text>
          </View>

          {/* Toggle */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDraftNudgeEnabled((prev) => !prev);
            }}
            style={styles.sheetOption}
          >
            <Text style={[styles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>
              {t("lobby.nudge")}
            </Text>
            <View
              style={[
                styles.toggle,
                { backgroundColor: draftNudgeEnabled ? theme.colors.primary : theme.colors.textSecondary + "30" },
              ]}
            >
              <View style={[styles.toggleKnob, { alignSelf: draftNudgeEnabled ? "flex-end" : "flex-start" }]} />
            </View>
          </Pressable>

          {/* Minutes options */}
          <View style={{ opacity: draftNudgeEnabled ? 1 : 0.35 }} pointerEvents={draftNudgeEnabled ? "auto" : "none"}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: "500", marginBottom: 4, marginTop: 8 }}>
              {t("lobby.minutesBeforeKickoff")}
            </Text>
            {NUDGE_WINDOW_OPTIONS.map((min) => (
              <Pressable
                key={min}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDraftNudgeMinutes(min);
                }}
                style={({ pressed }) => [styles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>
                  {min} min
                </Text>
                <Ionicons
                  name={min === draftNudgeMinutes ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={min === draftNudgeMinutes ? theme.colors.primary : theme.colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleNudgeDone}
            disabled={nudgeUnchanged}
            style={({ pressed }) => [
              styles.sheetDoneBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: nudgeUnchanged ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
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
  rowValue: {
    fontSize: 14,
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sheetOptionLabel: {
    fontSize: 14,
  },
  sheetDoneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  sheetDoneBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
