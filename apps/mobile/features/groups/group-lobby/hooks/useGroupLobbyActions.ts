import { useCallback } from "react";
import type { ApiGroupPrivacy, ApiInviteAccess } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PredictionMode } from "../components/PredictionModeSelector";
import type { KORoundMode } from "../components/KORoundModeSelector";

/**
 * Hook to handle group lobby actions (publish, etc.).
 *
 * @param publishGroupMutation - React Query mutation for publishing a group
 * @param draftName - Current draft name
 * @param draftPrivacy - Current draft privacy
 * @param draftInviteAccess - Current draft invite access
 * @param scoringValues - Current scoring values
 * @param predictionMode - Current prediction mode
 * @param koRoundMode - Current KO round mode
 * @param maxMembers - Maximum number of members in the group
 * @returns Action handlers
 */
export function useGroupLobbyActions(
  publishGroupMutation: UseMutationResult<
    unknown,
    unknown,
    {
      name?: string;
      privacy?: ApiGroupPrivacy;
      inviteAccess?: ApiInviteAccess;
      onTheNosePoints?: number;
      correctDifferencePoints?: number;
      outcomePoints?: number;
      predictionMode?: string;
      koRoundMode?: string;
      maxMembers?: number;
    }
  >,
  draftName: string,
  draftPrivacy: ApiGroupPrivacy,
  draftInviteAccess: ApiInviteAccess,
  scoringValues: { onTheNose: number; goalDifference: number; outcome: number },
  predictionMode?: PredictionMode,
  koRoundMode?: KORoundMode,
  maxMembers?: number
): {
  handlePublish: () => Promise<void>;
} {
  const handlePublish = useCallback(async () => {
    const nextName = draftName.trim();
    if (!nextName) return;

    // Map prediction mode from mobile format to server format
    const mapPredictionMode = (mode?: PredictionMode): string | undefined => {
      if (!mode) return undefined;
      return mode === "result" ? "CorrectScore" : "MatchWinner";
    };

    // Map KO round mode from mobile format to server format
    const mapKORoundMode = (mode?: KORoundMode): string | undefined => {
      if (!mode) return undefined;
      const mapping: Record<KORoundMode, string> = {
        "90min": "FullTime",
        extraTime: "ExtraTime",
        penalties: "Penalties",
      };
      return mapping[mode];
    };

    // Build body with all values
    const body: {
      name?: string;
      privacy?: ApiGroupPrivacy;
      inviteAccess?: ApiInviteAccess;
      onTheNosePoints?: number;
      correctDifferencePoints?: number;
      outcomePoints?: number;
      predictionMode?: string;
      koRoundMode?: string;
      maxMembers?: number;
    } = {
      name: nextName,
      privacy: draftPrivacy,
      inviteAccess: draftInviteAccess,
      onTheNosePoints: scoringValues.onTheNose,
      correctDifferencePoints: scoringValues.goalDifference,
      outcomePoints: scoringValues.outcome,
      maxMembers,
    };

    if (predictionMode) {
      body.predictionMode = mapPredictionMode(predictionMode);
    }

    if (koRoundMode) {
      body.koRoundMode = mapKORoundMode(koRoundMode);
    }

    try {
      await publishGroupMutation.mutateAsync(body);
      // After success, original values will refresh via query invalidation
    } catch {
      // Error handled by mutation; UI can retry by pressing Publish again
    }
  }, [
    draftName,
    draftPrivacy,
    draftInviteAccess,
    scoringValues,
    predictionMode,
    koRoundMode,
    maxMembers,
    publishGroupMutation,
  ]);

  return {
    handlePublish,
  };
}
