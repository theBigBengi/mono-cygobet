export const activityKeys = {
  all: ["activity"] as const,
  feed: () => [...activityKeys.all, "feed"] as const,
} as const;
