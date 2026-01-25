// features/groups/games-selection/components/SelectedGroupGamesModal.tsx
// Full screen modal displaying selected group games.
// Allows creating a group with selected games.

import React, { useMemo, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedGroupGames,
  useClearGroupGamesHook,
  useToggleGroupGame,
} from "../group-games-selection.hooks";
import { useCreateGroupMutation } from "@/domains/groups";
import { SelectedGameCard } from "./SelectedGameCard";
import type { ApiFixturesListResponse } from "@repo/types";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";

type FixtureItem = ApiFixturesListResponse["data"][0];

interface GroupedGame {
  fixtureId: number;
  game: FixtureItem;
}

type LeagueDateGroupWithGames = {
  key: string;
  leagueName: string;
  dateKey: string;
  kickoffIso: string | null;
  fixtures: GroupedGame[]; // Keep GroupedGame structure
};

function groupGroupedGamesByLeagueAndDate(
  games: GroupedGame[]
): LeagueDateGroupWithGames[] {
  // Extract fixtures from GroupedGame[]
  const fixtures = games.map((g) => g.game);

  // Group using shared function
  const leagueDateGroups = groupFixturesByLeagueAndDate(fixtures);

  // Map back to include fixtureId for each fixture
  return leagueDateGroups.map((group) => {
    // Find matching GroupedGame for each fixture
    const groupedFixtures: GroupedGame[] = group.fixtures
      .map((fixture) => {
        const groupedGame = games.find((g) => g.game.id === fixture.id);
        return groupedGame || { fixtureId: fixture.id, game: fixture };
      })
      .filter((g): g is GroupedGame => g !== undefined);

    return {
      key: group.key,
      leagueName: group.leagueName,
      dateKey: group.dateKey,
      kickoffIso: group.kickoffIso,
      fixtures: groupedFixtures,
    };
  });
}

interface SelectedGroupGamesModalProps {
  visible: boolean;
  onRequestClose: () => void;
}

export function SelectedGroupGamesModal({
  visible,
  onRequestClose,
}: SelectedGroupGamesModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { games } = useSelectedGroupGames();
  const clearSelectedGroupGames = useClearGroupGamesHook();
  const toggleGroupGame = useToggleGroupGame();
  const createGroupMutation = useCreateGroupMutation();

  const groupedGames = useMemo(() => {
    return groupGroupedGamesByLeagueAndDate(games);
  }, [games]);

  // Reset mutation state when modal closes
  useEffect(() => {
    if (!visible) {
      createGroupMutation.reset();
    }
  }, [visible, createGroupMutation]);

  const handleCreateGroup = async () => {
    if (games.length === 0) {
      return;
    }

    try {
      // Extract fixtureIds from selected games
      const fixtureIds = games.map(({ fixtureId }) => fixtureId);

      // Create group with empty name (server will generate automatic name)
      const result = await createGroupMutation.mutateAsync({
        name: "", // Empty name triggers auto-generation on server
        privacy: "private",
        fixtureIds,
      });

      // Clear selected games
      await clearSelectedGroupGames();

      // Close modal
      onRequestClose();

      // Navigate to group lobby
      router.push(`/groups/${result.data.id}` as any);
    } catch {
      // Error is handled by mutation, stay in modal
      // Error UI will be shown below
    }
  };

  const isCreating = createGroupMutation.isPending;
  const hasError = createGroupMutation.isError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onRequestClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
    >
      <View
        style={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
            // paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Pressable
            onPress={onRequestClose}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isCreating}
          >
            <MaterialIcons
              name="close"
              size={32}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.modalHeaderTitle}>
            Selected Games
          </AppText>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          scrollEnabled={!isCreating}
        >
          {games.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AppText variant="body" color="secondary">
                No games selected
              </AppText>
            </View>
          ) : (
            groupedGames.map((group) => (
              <LeagueDateGroupSection
                key={group.key}
                leagueName={group.leagueName}
                dateKey={group.dateKey}
                kickoffIso={group.kickoffIso}
              >
                <View style={styles.groupCardContainer}>
                  {group.fixtures.map(({ fixtureId, game }, index) => {
                    const isFirst = index === 0;
                    const isLast = index === group.fixtures.length - 1;
                    const positionInGroup =
                      group.fixtures.length === 1
                        ? "single"
                        : isFirst
                          ? "top"
                          : isLast
                            ? "bottom"
                            : "middle";

                    return (
                      <SelectedGameCard
                        key={fixtureId}
                        fixture={game}
                        positionInGroup={positionInGroup}
                        onRemove={() => toggleGroupGame(fixtureId, game)}
                      />
                    );
                  })}
                </View>
              </LeagueDateGroupSection>
            ))
          )}
        </ScrollView>

        {/* Loading Overlay */}
        {isCreating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText
              variant="body"
              color="secondary"
              style={styles.loadingText}
            >
              Creating group...
            </AppText>
          </View>
        )}

        {/* Floating Create Group Button */}
        <View
          style={[
            styles.floatingButtonContainer,
            {
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              padding: theme.spacing.md,
            },
          ]}
          pointerEvents="box-none"
        >
          {hasError && (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <AppText
                variant="caption"
                color="danger"
                style={styles.errorText}
              >
                {createGroupMutation.error?.message || "Failed to create group"}
              </AppText>
            </View>
          )}
          <Button
            label={isCreating ? "Creating..." : "Create Group"}
            onPress={handleCreateGroup}
            disabled={isCreating || games.length === 0}
            style={styles.floatingButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPlaceholder: {
    width: 32,
  },
  modalHeaderTitle: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Space for floating button
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  dateSection: {
    // רווח בין קבוצות של ליגה/תאריך
    marginBottom: 16,
  },
  groupCardContainer: {
    marginTop: 4,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  dateHeaderLeft: {
    flex: 1,
  },
  leagueName: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: "400",
    marginLeft: 12,
    opacity: 0.6,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 1000,
  },
  floatingButton: {
    minWidth: 200,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 99,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  loadingText: {
    marginTop: 12,
  },
  errorContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: "90%",
  },
  errorText: {
    textAlign: "center",
  },
});
