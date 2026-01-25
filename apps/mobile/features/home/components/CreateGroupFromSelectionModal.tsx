// features/home/components/CreateGroupFromSelectionModal.tsx
// Modal to create group from selection. Supports games, leagues, teams.

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
import { AppText, Button, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedGroupGames,
  useClearGroupGamesHook,
  useToggleGroupGame,
} from "@/features/groups/games-selection";
import {
  useSelectedLeagues,
  useClearSelectedLeaguesHook,
  useToggleLeague,
} from "@/features/groups/group-leagues-selection";
import {
  useSelectedTeams,
  useClearSelectedTeamsHook,
  useToggleTeam,
} from "@/features/groups/group-teams-selection";
import { useCreateGroupMutation } from "@/domains/groups";
import { SelectedGameCard } from "@/features/groups/games-selection/components/SelectedGameCard";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import type { HomeMode } from "./HomeModeSelector";
import type { ApiFixturesListResponse } from "@repo/types";

type FixtureItem = ApiFixturesListResponse["data"][0];

interface GroupedGame {
  fixtureId: number;
  game: FixtureItem;
}

function groupGroupedGamesByLeagueAndDate(
  games: GroupedGame[]
): {
  key: string;
  leagueName: string;
  dateKey: string;
  kickoffIso: string | null;
  fixtures: GroupedGame[];
}[] {
  const fixtures = games.map((g) => g.game);
  const leagueDateGroups = groupFixturesByLeagueAndDate(fixtures);
  return leagueDateGroups.map((group) => {
    const groupedFixtures: GroupedGame[] = group.fixtures
      .map((fixture) => {
        const g = games.find((x) => x.game.id === fixture.id);
        return g ?? { fixtureId: fixture.id, game: fixture };
      })
      .filter((g): g is GroupedGame => g != null);
    return {
      key: group.key,
      leagueName: group.leagueName,
      dateKey: group.dateKey,
      kickoffIso: group.kickoffIso,
      fixtures: groupedFixtures,
    };
  });
}

interface CreateGroupFromSelectionModalProps {
  visible: boolean;
  onRequestClose: () => void;
  mode: HomeMode;
}

export function CreateGroupFromSelectionModal({
  visible,
  onRequestClose,
  mode,
}: CreateGroupFromSelectionModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { games } = useSelectedGroupGames();
  const clearGames = useClearGroupGamesHook();
  const toggleGame = useToggleGroupGame();
  const leagues = useSelectedLeagues();
  const clearLeagues = useClearSelectedLeaguesHook();
  const toggleLeague = useToggleLeague();
  const teams = useSelectedTeams();
  const clearTeams = useClearSelectedTeamsHook();
  const toggleTeam = useToggleTeam();
  const createGroupMutation = useCreateGroupMutation();

  const groupedGames = useMemo(
    () => groupGroupedGamesByLeagueAndDate(games),
    [games]
  );

  useEffect(() => {
    if (!visible) createGroupMutation.reset();
  }, [visible, createGroupMutation]);

  const handleCreate = async () => {
    if (mode === "fixtures" && games.length === 0) return;
    if (mode === "leagues" && leagues.length === 0) return;
    if (mode === "teams" && teams.length === 0) return;

    try {
      if (mode === "fixtures") {
        const result = await createGroupMutation.mutateAsync({
          name: "",
          privacy: "private",
          selectionMode: "games",
          fixtureIds: games.map((g) => g.fixtureId),
        });
        await clearGames();
        onRequestClose();
        router.push(`/groups/${result.data.id}` as any);
        return;
      }
      if (mode === "leagues") {
        const result = await createGroupMutation.mutateAsync({
          name: "",
          privacy: "private",
          selectionMode: "leagues",
          leagueIds: leagues.map((l) => l.id),
        });
        clearLeagues();
        onRequestClose();
        router.push(`/groups/${result.data.id}` as any);
        return;
      }
      if (mode === "teams") {
        const result = await createGroupMutation.mutateAsync({
          name: "",
          privacy: "private",
          selectionMode: "teams",
          teamIds: teams.map((t) => t.id),
        });
        clearTeams();
        onRequestClose();
        router.push(`/groups/${result.data.id}` as any);
      }
    } catch {
      // Error handled by mutation; stay in modal
    }
  };

  const isCreating = createGroupMutation.isPending;
  const hasError = createGroupMutation.isError;
  const canCreate =
    (mode === "fixtures" && games.length > 0) ||
    (mode === "leagues" && leagues.length > 0) ||
    (mode === "teams" && teams.length > 0);

  const title =
    mode === "fixtures"
      ? "Selected Games"
      : mode === "leagues"
        ? "Selected League"
        : "Selected Teams";

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
            onPress={onRequestClose}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isCreating}
          >
            <MaterialIcons
              name="close"
              size={32}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {title}
          </AppText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!isCreating}
        >
          {mode === "fixtures" && (
            <>
              {games.length === 0 ? (
                <View style={styles.empty}>
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
                    <View style={styles.groupCards}>
                      {group.fixtures.map(({ fixtureId, game }, i) => {
                        const n = group.fixtures.length;
                        const pos =
                          n === 1
                            ? "single"
                            : i === 0
                              ? "top"
                              : i === n - 1
                                ? "bottom"
                                : "middle";
                        return (
                          <SelectedGameCard
                            key={fixtureId}
                            fixture={game}
                            positionInGroup={pos}
                            onRemove={() => toggleGame(fixtureId, game)}
                          />
                        );
                      })}
                    </View>
                  </LeagueDateGroupSection>
                ))
              )}
            </>
          )}
          {mode === "leagues" && (
            <>
              {leagues.length === 0 ? (
                <View style={styles.empty}>
                  <AppText variant="body" color="secondary">
                    No league selected
                  </AppText>
                </View>
              ) : (
                leagues.map((l) => (
                  <Card key={l.id} style={styles.listCard}>
                    <View style={styles.row}>
                      <AppText variant="body" style={styles.flex1}>
                        {l.name}
                      </AppText>
                      <Pressable
                        onPress={() => toggleLeague(l)}
                        style={({ pressed }) => [
                          styles.removeBtn,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <MaterialIcons
                          name="close"
                          size={20}
                          color={theme.colors.danger}
                        />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
          {mode === "teams" && (
            <>
              {teams.length === 0 ? (
                <View style={styles.empty}>
                  <AppText variant="body" color="secondary">
                    No teams selected
                  </AppText>
                </View>
              ) : (
                teams.map((t) => (
                  <Card key={t.id} style={styles.listCard}>
                    <View style={styles.row}>
                      <AppText variant="body" style={styles.flex1}>
                        {t.name}
                      </AppText>
                      <Pressable
                        onPress={() => toggleTeam(t)}
                        style={({ pressed }) => [
                          styles.removeBtn,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <MaterialIcons
                          name="close"
                          size={20}
                          color={theme.colors.danger}
                        />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>

        {isCreating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="body" color="secondary" style={styles.loadingTxt}>
              Creating group…
            </AppText>
          </View>
        )}

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              paddingHorizontal: theme.spacing.md,
            },
          ]}
          pointerEvents="box-none"
        >
          {hasError && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <AppText variant="caption" color="danger" style={styles.errorTxt}>
                {createGroupMutation.error?.message ?? "Failed to create group"}
              </AppText>
            </View>
          )}
          <Button
            label={isCreating ? "Creating…" : "Create Group"}
            onPress={handleCreate}
            disabled={isCreating || !canCreate}
            style={styles.createBtn}
          />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  groupCards: {
    marginTop: 4,
  },
  listCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  loadingTxt: {
    marginTop: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
  },
  errorTxt: {
    textAlign: "center",
  },
  createBtn: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 99,
  },
});
