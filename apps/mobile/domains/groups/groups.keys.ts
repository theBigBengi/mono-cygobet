// domains/groups/groups.keys.ts
// React Query keys for groups domain.
// - All groups-related queries/mutations must use these keys.

export const groupsKeys = {
  all: ["groups"] as const,
  lists: () => [...groupsKeys.all, "list"] as const,
  list: () => [...groupsKeys.lists()] as const,
  details: () => [...groupsKeys.all, "detail"] as const,
  detail: (id: number, includeFixtures?: boolean) =>
    [
      ...groupsKeys.details(),
      id,
      ...(includeFixtures ? ["fixtures"] : []),
    ] as const,
  fixtures: (id: number) => [...groupsKeys.details(), id, "fixtures"] as const,
} as const;
