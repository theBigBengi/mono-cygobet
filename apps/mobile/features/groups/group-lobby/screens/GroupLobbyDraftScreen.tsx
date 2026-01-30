// features/groups/group-lobby/screens/GroupLobbyDraftScreen.tsx
// Draft state screen for group lobby.
// Shows editable name, status card, privacy settings, and publish button.

import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";
import {
  GroupLobbyNameHeader,
  GroupLobbyStatusCard,
  GroupLobbyScoringSection,
  PredictionModeSelector,
  KORoundModeSelector,
  GroupLobbyFixturesSection,
  GroupLobbyPrivacySection,
  GroupLobbyInviteAccessSection,
  GroupLobbyMetaSection,
  PublishGroupButton,
  DeleteGroupButton,
  useGroupLobbyState,
  useGroupLobbyActions,
  type FixtureItem,
  type PredictionMode,
  type KORoundMode,
} from "../index";
import {
  usePublishGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
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
  const router = useRouter();
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manage local state for draft name, privacy, and invite access
  const {
    draftName,
    draftPrivacy,
    draftInviteAccess,
    setDraftName,
    setDraftPrivacy,
    setDraftInviteAccess,
  } = useGroupLobbyState(group.name, group.privacy, group.inviteAccess);

  // Manage local state for prediction mode (default to "result")
  const [predictionMode, setPredictionMode] = useState<PredictionMode>("result");

  // Manage local state for KO round mode (default to "90min")
  const [koRoundMode, setKORoundMode] = useState<KORoundMode>("90min");

  // Manage local state for scoring values
  const [scoringValues, setScoringValues] = useState({
    onTheNose: 3,
    goalDifference: 2,
    outcome: 1,
  });

  // Local mutations - tied to this group
  const updateGroupMutation = useUpdateGroupMutation(group.id);
  const publishGroupMutation = usePublishGroupMutation(group.id);
  const deleteGroupMutation = useDeleteGroupMutation(group.id);

  // Derive fixtures from group.fixtures
  const fixtures =
    Array.isArray((group as any).fixtures) ? ((group as any).fixtures as FixtureItem[]) : [];

  // Handle publish action
  const { handlePublish } = useGroupLobbyActions(
    publishGroupMutation,
    draftName,
    draftPrivacy,
    draftInviteAccess,
    scoringValues,
    predictionMode,
    koRoundMode
  );

  // Determine if name/privacy inputs should be editable
  const isEditable =
    !publishGroupMutation.isPending &&
    !updateGroupMutation.isPending &&
    !deleteGroupMutation.isPending;

  // Handler for navigating to view all games
  const handleViewAllGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  // Cleanup fallback timer on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  // Handler for deleting the group
  const handleDeleteGroup = () => {
    Alert.alert(
      "Delete Group Draft",
      "Are you sure you want to delete the group? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteGroupMutation.mutate(undefined, {
              onSuccess: () => {
                // Try to go back first (for correct slide animation from right to left)
                // This works when there's navigation history (e.g., came from groups list)
                router.back();
                
                // Fallback: if back() didn't work (no history, e.g., just created group),
                // navigate using replace after a short delay
                // The timer will be cleared if component unmounts (back() worked)
                fallbackTimerRef.current = setTimeout(() => {
                  router.replace("/(tabs)/groups" as any);
                  fallbackTimerRef.current = null;
                }, 300);
              },
              onError: (error: any) => {
                Alert.alert(
                  "שגיאה",
                  error?.message || "Delete group draft failed. Please try again."
                );
              },
            });
          },
        },
      ]
    );
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

          {/* Selected Games Section */}
          <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          onViewAll={handleViewAllGames}
        />

       
        {/* Scoring System Section */}
        {isCreator && (
          <GroupLobbyScoringSection
            initialOnTheNose={scoringValues.onTheNose}
            initialGoalDifference={scoringValues.goalDifference}
            initialOutcome={scoringValues.outcome}
            onChange={(values) => setScoringValues(values)}
            disabled={!isEditable}
          />
        )}

        {/* Prediction Mode Selector Section */}
        {isCreator && (
          <PredictionModeSelector
            value={predictionMode}
            onChange={setPredictionMode}
            disabled={!isEditable}
          />
        )}

        {/* KO Round Mode Selector Section */}
        {isCreator && (
          <KORoundModeSelector
            value={koRoundMode}
            onChange={setKORoundMode}
            disabled={!isEditable}
          />
        )}

      

        {/* Privacy Toggle Section (Only for creators) */}
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

        <DeleteGroupButton
          onPress={handleDeleteGroup}
          isPending={deleteGroupMutation.isPending}
          disabled={deleteGroupMutation.isPending}
        />
      </Screen>

      {/* Floating Action Buttons (Only for creators) */}
      {isCreator && (
        <>
          <PublishGroupButton
            onPress={handlePublish}
            isPending={publishGroupMutation.isPending}
            disabled={
              publishGroupMutation.isPending ||
              deleteGroupMutation.isPending ||
              !draftName.trim()
            }
          />
       
        </>
      )}

      {/* Loading Overlay with Blur */}
      {deleteGroupMutation.isPending && (
        <View style={styles.overlay} pointerEvents="box-none">
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="body" style={styles.overlayText}>
              Deleting group...
            </AppText>
          </View>
        </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    alignItems: "center",
    gap: 16,
  },
  overlayText: {
    marginTop: 12,
  },
});
