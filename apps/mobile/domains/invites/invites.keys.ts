// domains/invites/invites.keys.ts
// React Query keys for invites domain.

export const invitesKeys = {
  all: ["invites"] as const,
  lists: () => [...invitesKeys.all, "list"] as const,
  list: (
    status?: "pending" | "accepted" | "declined" | "expired" | "cancelled"
  ) => [...invitesKeys.lists(), status] as const,
  detail: (id: number) => [...invitesKeys.all, "detail", id] as const,
  search: (q: string, excludeGroupId?: number) =>
    [...invitesKeys.all, "search", q, excludeGroupId] as const,
  suggested: (excludeGroupId?: number) =>
    [...invitesKeys.all, "suggested", excludeGroupId] as const,
} as const;
