// domains/groups/groups.keys.ts
// React Query keys for groups domain.
// - All groups-related queries/mutations must use these keys.

import type { ApiPublicGroupsQuery } from "@repo/types";

export const groupsKeys = {
  all: ["groups"] as const,
  lists: () => [...groupsKeys.all, "list"] as const,
  list: () => [...groupsKeys.lists()] as const,
  publicList: (params: ApiPublicGroupsQuery) =>
    [...groupsKeys.all, "public", params] as const,
  details: () => [...groupsKeys.all, "detail"] as const,
  detail: (id: number, includeFixtures?: boolean) =>
    [
      ...groupsKeys.details(),
      id,
      ...(includeFixtures ? ["fixtures"] : []),
    ] as const,
  fixtures: (id: number) => [...groupsKeys.details(), id, "fixtures"] as const,
  gamesFilters: (id: number) =>
    [...groupsKeys.details(), id, "games-filters"] as const,
  predictionsOverview: (id: number) =>
    [...groupsKeys.details(), id, "predictions-overview"] as const,
  ranking: (id: number) =>
    [...groupsKeys.details(), id, "ranking"] as const,
  members: (id: number) =>
    [...groupsKeys.details(), id, "members"] as const,
  inviteCode: (id: number) =>
    [...groupsKeys.details(), id, "invite-code"] as const,
  messages: (groupId: number) =>
    [...groupsKeys.details(), groupId, "messages"] as const,
  unreadCounts: () => [...groupsKeys.all, "unread-counts"] as const,
} as const;
