// features/groups/group-lobby/screens/GroupLobbyDraftScreen.tsx
// Draft state screen for group lobby.
// Shows editable name, status card, privacy settings, and publish button.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui";
import type { ApiGroupItem } from "@repo/types";
import {
  GroupLobbyNameHeader,
  GroupLobbyStatusCard,
  GroupLobbyFixturesSection,
  GroupLobbyPrivacySection,
  GroupLobbyMetaSection,
  PublishGroupButton,
  useGroupLobbyState,
  useGroupLobbyActions,
  type FixtureItem,
} from "../index";
import { usePublishGroupMutation, useUpdateGroupMutation } from "@/domains/groups";

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

  // Manage local state for draft name and privacy
  const { draftName, draftPrivacy, setDraftName, setDraftPrivacy } =
    useGroupLobbyState(group.name, group.privacy);

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
    draftPrivacy
  );

  // Determine if name/privacy inputs should be editable
  const isEditable =
    !publishGroupMutation.isPending &&
    !updateGroupMutation.isPending;

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
        {/* Header Section - Group Name (Editable) */}
        <GroupLobbyNameHeader
          name={draftName}
          onChange={setDraftName}
          editable={isEditable}
          isCreator={isCreator}
        />

        {/* Status Section - Draft Badge */}
        <GroupLobbyStatusCard status={group.status} isCreator={isCreator} />

        {/* Selected Games Section */}
        <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          onViewAll={handleViewAllGames}
        />

        {/* Privacy Toggle Section (Only for creators) */}
        <GroupLobbyPrivacySection
          privacy={draftPrivacy}
          onChange={setDraftPrivacy}
          disabled={!isEditable}
          isCreator={isCreator}
          status={group.status}
        />

        {/* Meta Section */}
        <GroupLobbyMetaSection createdAt={group.createdAt} />
      </Screen>

      {/* Floating Publish Button (Only for creators) */}
      {isCreator && (
        <PublishGroupButton
          onPress={handlePublish}
          isPending={publishGroupMutation.isPending}
          disabled={publishGroupMutation.isPending || !draftName.trim()}
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
    paddingBottom: 100, // Space for floating button
  },
});
