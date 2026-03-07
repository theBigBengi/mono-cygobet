// features/group-creation/components/CreateSheetAdvancedStep.tsx
// Extracted step 2 (advanced settings) from CreateGroupFlow.tsx

import React from "react";
import { View, Pressable, Text, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { createStyles } from "./createGroupFlow.styles";
import type { Theme } from "@/lib/theme/theme.types";
import type { ApiGroupPreviewResponse } from "@repo/types";

interface CreateSheetAdvancedStepProps {
  onOpenAdvSheet: (sheet: "prediction" | "scoring" | "ko" | "members" | "nudgeWindow") => void;
  predictionMode: "CorrectScore" | "ThreeWay";
  onTheNosePoints: number;
  differencePoints: number;
  outcomePoints: number;
  koRoundMode: "FullTime" | "ExtraTime" | "Penalties";
  maxMembers: number;
  nudgeEnabled: boolean;
  nudgeWindowMinutes: number;
  inviteAccess: "all" | "admin_only";
  onInviteAccessChange: (val: "all" | "admin_only") => void;
  draftPrivacy: "private" | "public";
  setDraftPrivacy: React.Dispatch<React.SetStateAction<"private" | "public">>;
  durationLabel: string;
  preview: ApiGroupPreviewResponse | undefined;
  handleCreateAndPublish: () => void;
  isCreating: boolean;
  groupName: string;
  theme: Theme;
  bottomInset: number;
}

export function CreateSheetAdvancedStep({
  onOpenAdvSheet,
  predictionMode,
  onTheNosePoints,
  differencePoints,
  outcomePoints,
  koRoundMode,
  maxMembers,
  nudgeEnabled,
  nudgeWindowMinutes,
  inviteAccess,
  onInviteAccessChange,
  draftPrivacy,
  setDraftPrivacy,
  durationLabel,
  preview,
  handleCreateAndPublish,
  isCreating,
  groupName,
  theme,
  bottomInset,
}: CreateSheetAdvancedStepProps) {
  const { t } = useTranslation("common");

  return (
    <View style={{ flex: 1 }}>
    {/* Step 2: Advanced */}
    <ScrollView style={{ flex: 1 }} contentContainerStyle={createStyles.advancedContent}>
      {/* Info */}
      <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary }]}>
        {t("lobby.info")}
      </Text>
      <View style={createStyles.advRow}>
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.groupDuration")}</Text>
        <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>
          {durationLabel}
        </Text>
      </View>
      <View style={createStyles.advRow}>
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.games")}</Text>
        <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{preview?.data?.fixtureCount ?? 0} {(preview?.data?.fixtureCount ?? 0) === 1 ? "game" : "games"}</Text>
      </View>

      {/* Predictions */}
      <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
        {t("lobby.predictionRules")}
      </Text>
      <Pressable
        onPress={() => onOpenAdvSheet("prediction")}
        style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.predictionMode")}</Text>
        <View style={createStyles.advRowRight}>
          <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{predictionMode === "CorrectScore" ? t("lobby.exactResult") : t("lobby.matchWinner")}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => onOpenAdvSheet("scoring")}
        style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.scoring")}</Text>
        <View style={createStyles.advRowRight}>
          <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{onTheNosePoints} · {differencePoints} · {outcomePoints}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => onOpenAdvSheet("ko")}
        style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.koRoundMode")}</Text>
        <View style={createStyles.advRowRight}>
          <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{koRoundMode === "FullTime" ? t("lobby.90min") : koRoundMode === "ExtraTime" ? t("lobby.extraTime") : t("lobby.penalties")}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
        </View>
      </Pressable>

      {/* <Pressable
        onPress={() => onOpenAdvSheet("members")}
        style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.maxMembers")}</Text>
        <View style={createStyles.advRowRight}>
          <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{maxMembers}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
        </View>
      </Pressable> */}
      <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
        {t("groupSettings.notifications")}
      </Text>
      <Pressable
        onPress={() => onOpenAdvSheet("nudgeWindow")}
        style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.nudge")}</Text>
        <View style={createStyles.advRowRight}>
          <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{nudgeEnabled ? `${nudgeWindowMinutes} min` : "Off"}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setDraftPrivacy((prev) => prev === "private" ? "public" : "private");
        }}
        style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.private")}</Text>
          <Text style={[createStyles.advRowSub, { color: theme.colors.textSecondary }]}>{draftPrivacy === "private" ? t("lobby.privateDescription") : t("lobby.publicDescription")}</Text>
        </View>
        <View style={[createStyles.advToggle, { backgroundColor: draftPrivacy === "private" ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
          <View style={[createStyles.advToggleKnob, { alignSelf: draftPrivacy === "private" ? "flex-end" : "flex-start" }]} />
        </View>
      </Pressable>
      {draftPrivacy === "private" && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onInviteAccessChange(inviteAccess === "all" ? "admin_only" : "all");
          }}
          style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.inviteSharing")}</Text>
            <Text style={[createStyles.advRowSub, { color: theme.colors.textSecondary }]}>{inviteAccess === "all" ? t("lobby.allMembersCanShare") : t("lobby.onlyAdminsCanShare")}</Text>
          </View>
          <View style={[createStyles.advToggle, { backgroundColor: inviteAccess === "all" ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
            <View style={[createStyles.advToggleKnob, { alignSelf: inviteAccess === "all" ? "flex-end" : "flex-start" }]} />
          </View>
        </Pressable>
      )}
    </ScrollView>
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: Math.max(bottomInset, 16) }}>
      <Pressable
        onPress={handleCreateAndPublish}
        disabled={isCreating || groupName.trim().length === 0}
        style={({ pressed }) => [
          createStyles.continueBottomBtn,
          {
            borderColor: groupName.trim().length > 0 && !isCreating
              ? theme.colors.primary + "40"
              : theme.colors.textSecondary + "20",
            marginBottom: 0,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <>
            <AppText variant="caption" style={{ color: groupName.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "60", fontWeight: "600", fontSize: 13 }}>
              {t("groupCreation.createGroup")}
            </AppText>
            <Ionicons name="arrow-forward" size={14} color={groupName.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "60"} />
          </>
        )}
      </Pressable>
    </View>
    </View>
  );
}
