// groups/constants.ts
// Constants for groups service.

export const GROUP_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ENDED: "ended",
} as const;

export const MEMBER_STATUS = {
  JOINED: "joined",
  LEFT: "left",
  PENDING: "pending",
} as const;

export const GROUP_PRIVACY = {
  PRIVATE: "private",
  PUBLIC: "public",
} as const;

export const DEFAULT_MAX_MEMBERS = 50;

export const SELECTION_MODE = {
  GAMES: "games",
  TEAMS: "teams",
  LEAGUES: "leagues",
} as const;
