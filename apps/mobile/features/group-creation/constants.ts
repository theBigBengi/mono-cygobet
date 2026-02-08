// features/group-creation/constants.ts
// Default values for group creation and publishing.

export const GROUP_DEFAULTS = {
  privacy: "private" as const,
  inviteAccess: "all" as const,
  onTheNosePoints: 3,
  correctDifferencePoints: 2,
  outcomePoints: 1,
  predictionMode: "CorrectScore" as const,
  koRoundMode: "FullTime" as const,
  maxMembers: 50,
  nudgeEnabled: true,
  nudgeWindowMinutes: 60,
} as const;
