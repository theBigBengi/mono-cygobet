// features/groups/group-lobby/screens/GroupLobbyDraftScreen.tsx
// Draft state screen for group lobby.
// Shows editable name, status card, privacy settings, and publish button.

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen, AppText } from "@/components/ui";
import type { ApiGroupItem } from "@repo/types";
import {
  GroupLobbyNameHeader,
  GroupLobbyStatusCard,
  GroupLobbyScoringSection,
  GroupLobbyMaxMembersSection,
  PredictionModeSelector,
  KORoundModeSelector,
  GroupLobbyFixturesSection,
  GroupLobbyPrivacySection,
  GroupLobbyInviteAccessSection,
  GroupLobbyMetaSection,
  PublishGroupButton,
  useGroupLobbyState,
  useGroupLobbyActions,
  type FixtureItem,
  type PredictionMode,
  type KORoundMode,
} from "../index";
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

  // Manage local state for max members
  const [maxMembers, setMaxMembers] = useState(50);

  // Local mutations - tied to this group
  const updateGroupMutation = useUpdateGroupMutation(group.id);
  const publishGroupMutation = usePublishGroupMutation(group.id);

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
          Games
        </AppText>
        <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          onViewAll={handleViewAllGames}
        />

        {/* Section: Prediction rules */}
        {isCreator && (
          <>
            <AppText variant="subtitle" style={styles.sectionTitle}>
              Prediction rules
            </AppText>
            <GroupLobbyScoringSection
              initialOnTheNose={scoringValues.onTheNose}
              initialGoalDifference={scoringValues.goalDifference}
              initialOutcome={scoringValues.outcome}
              onChange={(values) => setScoringValues(values)}
              disabled={!isEditable}
            />
            <PredictionModeSelector
              value={predictionMode}
              onChange={setPredictionMode}
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
          </>
        )}

        {/* Section: Privacy & invite */}
        <AppText variant="subtitle" style={styles.sectionTitle}>
          Privacy & invite
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
});
