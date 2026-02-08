// features/group-creation/hooks/useCreateGroup.ts
// Hook encapsulating group creation logic (draft and create-and-publish).

import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useSetAtom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateGroupMutation,
  publishGroup,
  groupsKeys,
} from "@/domains/groups";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import {
  useSelectedGroupGames,
  useClearGroupGamesHook,
} from "@/features/group-creation/selection/games";
import {
  useSelectedLeagues,
  useClearSelectedLeaguesHook,
} from "@/features/group-creation/selection/leagues";
import {
  useSelectedTeams,
  useClearSelectedTeamsHook,
} from "@/features/group-creation/selection/teams";
import { createGroupModalVisibleAtom } from "../screens/create-group-modal.atom";
import { currentSelectionModeAtom } from "../selection/mode.atom";
import { GROUP_DEFAULTS } from "../constants";
import type { SelectionMode } from "../components/SelectionModeTabs";

function buildCreateBody(
  mode: SelectionMode,
  games: { fixtureId: number }[],
  leagues: { id: number }[],
  teams: { id: number }[]
) {
  if (mode === "fixtures" && games.length > 0) {
    return {
      name: "",
      privacy: GROUP_DEFAULTS.privacy,
      selectionMode: "games" as const,
      fixtureIds: games.map((g) => g.fixtureId),
    };
  }
  if (mode === "leagues" && leagues.length > 0) {
    return {
      name: "",
      privacy: GROUP_DEFAULTS.privacy,
      selectionMode: "leagues" as const,
      leagueIds: leagues.map((l) => l.id),
    };
  }
  if (mode === "teams" && teams.length > 0) {
    return {
      name: "",
      privacy: GROUP_DEFAULTS.privacy,
      selectionMode: "teams" as const,
      teamIds: teams.map((t) => t.id),
    };
  }
  return null;
}

export function useCreateGroup() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const setOverlay = useSetAtom(globalBlockingOverlayAtom);
  const setModalVisible = useSetAtom(createGroupModalVisibleAtom);
  const mode = useAtomValue(currentSelectionModeAtom);

  const { games } = useSelectedGroupGames();
  const clearGames = useClearGroupGamesHook();
  const leagues = useSelectedLeagues();
  const clearLeagues = useClearSelectedLeaguesHook();
  const teams = useSelectedTeams();
  const clearTeams = useClearSelectedTeamsHook();

  const createGroupMutation = useCreateGroupMutation();

  const clearSelection = useCallback(() => {
    if (mode === "fixtures") clearGames();
    if (mode === "leagues") clearLeagues();
    if (mode === "teams") clearTeams();
  }, [mode, clearGames, clearLeagues, clearTeams]);

  const canCreate =
    (mode === "fixtures" && games.length > 0) ||
    (mode === "leagues" && leagues.length > 0) ||
    (mode === "teams" && teams.length > 0);

  const handleCreate = useCallback(async () => {
    setOverlay(t("groupCreation.creating"));
    const body = buildCreateBody(mode, games, leagues, teams);
    if (!body) {
      setOverlay(false);
      return;
    }
    try {
      const result = await createGroupMutation.mutateAsync(body);
      clearSelection();
      setModalVisible(false);
      router.replace(`/groups/${result.data.id}` as any);
    } catch {
      setOverlay(false);
    }
  }, [
    mode,
    games,
    leagues,
    teams,
    createGroupMutation,
    clearSelection,
    setOverlay,
    setModalVisible,
    router,
    t,
  ]);

  const handleCreateAndPublish = useCallback(async () => {
    setOverlay(t("groupCreation.creating"));
    const body = buildCreateBody(mode, games, leagues, teams);
    if (!body) {
      setOverlay(false);
      return;
    }
    try {
      const result = await createGroupMutation.mutateAsync(body);
      clearSelection();
      // Use API directly since groupId is only known after creation.
      // createGroupMutation.onSuccess already invalidates groupsKeys.lists().
      await publishGroup(result.data.id, {
        name: t("lobby.defaultGroupName"),
        privacy: GROUP_DEFAULTS.privacy,
        inviteAccess: GROUP_DEFAULTS.inviteAccess,
        onTheNosePoints: GROUP_DEFAULTS.onTheNosePoints,
        correctDifferencePoints: GROUP_DEFAULTS.correctDifferencePoints,
        outcomePoints: GROUP_DEFAULTS.outcomePoints,
        predictionMode: GROUP_DEFAULTS.predictionMode,
        koRoundMode: GROUP_DEFAULTS.koRoundMode,
        maxMembers: GROUP_DEFAULTS.maxMembers,
        nudgeEnabled: GROUP_DEFAULTS.nudgeEnabled,
        nudgeWindowMinutes: GROUP_DEFAULTS.nudgeWindowMinutes,
      });
      // Invalidate detail cache so the group page shows the published state
      queryClient.invalidateQueries({
        queryKey: groupsKeys.detail(result.data.id),
      });
      setModalVisible(false);
      router.replace(`/groups/${result.data.id}` as any);
    } catch {
      setOverlay(false);
    }
  }, [
    mode,
    games,
    leagues,
    teams,
    createGroupMutation,
    clearSelection,
    setOverlay,
    setModalVisible,
    router,
    queryClient,
    t,
  ]);

  return {
    mode,
    canCreate,
    isCreating: createGroupMutation.isPending,
    hasError: createGroupMutation.isError,
    error: createGroupMutation.error,
    isSuccess: createGroupMutation.isSuccess,
    reset: createGroupMutation.reset,
    handleCreate,
    handleCreateAndPublish,
  };
}
