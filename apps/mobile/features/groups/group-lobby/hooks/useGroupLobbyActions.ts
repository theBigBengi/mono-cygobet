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
 * @param draftDescription - Current draft description
 * @param draftPrivacy - Current draft privacy
 * @param draftInviteAccess - Current draft invite access
 * @param scoringValues - Current scoring values
 * @param predictionMode - Current prediction mode
 * @param koRoundMode - Current KO round mode
 * @param maxMembers - Maximum number of members in the group
 * @param nudgeEnabled - Whether nudge is enabled for the group
 * @param nudgeWindowMinutes - Nudge window in minutes before kickoff
 * @returns Action handlers
 */
export function useGroupLobbyActions(
  publishGroupMutation: UseMutationResult<
    unknown,
    unknown,
    {
      name?: string;
      description?: string;
      privacy?: ApiGroupPrivacy;
      inviteAccess?: ApiInviteAccess;
      onTheNosePoints?: number;
      correctDifferencePoints?: number;
      outcomePoints?: number;
      predictionMode?: string;
      koRoundMode?: string;
      maxMembers?: number;
      nudgeEnabled?: boolean;
      nudgeWindowMinutes?: number;
    }
  >,
  draftName: string,
  draftDescription: string,
  draftPrivacy: ApiGroupPrivacy,
  draftInviteAccess: ApiInviteAccess,
  scoringValues: { onTheNose: number; goalDifference: number; outcome: number },
  predictionMode?: PredictionMode,
  koRoundMode?: KORoundMode,
  maxMembers?: number,
  nudgeEnabled: boolean = true,
  nudgeWindowMinutes: number = 60,
  defaultName: string = "Prediction Group"
): {
  handlePublish: () => Promise<void>;
} {
  const handlePublish = useCallback(async () => {
    const nextName = draftName.trim() || defaultName;

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
      description?: string;
      privacy?: ApiGroupPrivacy;
      inviteAccess?: ApiInviteAccess;
      onTheNosePoints?: number;
      correctDifferencePoints?: number;
      outcomePoints?: number;
      predictionMode?: string;
      koRoundMode?: string;
      maxMembers?: number;
      nudgeEnabled?: boolean;
      nudgeWindowMinutes?: number;
    } = {
      name: nextName,
      description: draftDescription.trim() || undefined,
      privacy: draftPrivacy,
      inviteAccess: draftInviteAccess,
      onTheNosePoints: scoringValues.onTheNose,
      correctDifferencePoints: scoringValues.goalDifference,
      outcomePoints: scoringValues.outcome,
      maxMembers,
      nudgeEnabled,
      nudgeWindowMinutes,
    };

    if (predictionMode) {
      body.predictionMode = mapPredictionMode(predictionMode);
    }

    if (koRoundMode) {
      body.koRoundMode = mapKORoundMode(koRoundMode);
    }

    await publishGroupMutation.mutateAsync(body);
  }, [
    draftName,
    draftDescription,
    draftPrivacy,
    draftInviteAccess,
    scoringValues,
    predictionMode,
    koRoundMode,
    maxMembers,
    nudgeEnabled,
    nudgeWindowMinutes,
    publishGroupMutation,
    defaultName,
  ]);

  return {
    handlePublish,
  };
}
