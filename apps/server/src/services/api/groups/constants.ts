// groups/constants.ts
// Constants for groups service.

export const GROUP_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ENDED: "ended",
} as const;

export const MEMBER_STATUS = {
  JOINED: "joined",
} as const;

export const SELECTION_MODE = {
  GAMES: "games",
  TEAMS: "teams",
  LEAGUES: "leagues",
} as const;
