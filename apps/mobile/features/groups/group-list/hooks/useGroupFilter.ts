// features/groups/group-list/hooks/useGroupFilter.ts
// Hook to manage filter state and categorize/sort/filter groups for the tabbed list.

import { useState, useMemo, useEffect } from "react";
import type { ApiGroupItem } from "@repo/types";

export type GroupFilterType =
  | "all"
  | "active"
  | "drafts"
  | "ended";

export type GroupSortType =
  | "recents"
  | "recentlyAdded"
  | "alphabetical"
  | "creator";

const FILTER_PRIORITY: Exclude<GroupFilterType, "all">[] = [
  "active",
  "drafts",
  "ended",
];

interface GroupFilterResult {
  selectedFilter: GroupFilterType;
  setSelectedFilter: (filter: GroupFilterType) => void;
  selectedSort: GroupSortType;
  setSelectedSort: (sort: GroupSortType) => void;
  filteredGroups: ApiGroupItem[];
  counts: {
    all: number;
    active: number;
    drafts: number;
    ended: number;
  };
}

function needsAttention(group: ApiGroupItem): boolean {
  const hasLive = (group.liveGamesCount ?? 0) > 0;
  const hasUnpredicted = (group.todayUnpredictedCount ?? 0) > 0;
  return hasLive || hasUnpredicted;
}

function categorizeGroup(
  group: ApiGroupItem
): "active" | "drafts" | "ended" {
  if (group.status === "draft") return "drafts";
  if (group.status === "ended") return "ended";
  return "active";
}

export function useGroupFilter(groups: ApiGroupItem[]): GroupFilterResult {
  const [selectedFilter, setSelectedFilter] = useState<GroupFilterType>("active");
  const [selectedSort, setSelectedSort] = useState<GroupSortType>("recents");

  const { filteredGroups, counts } = useMemo(() => {
    const categorized = {
      active: [] as ApiGroupItem[],
      drafts: [] as ApiGroupItem[],
      ended: [] as ApiGroupItem[],
    };

    for (const group of groups) {
      const category = categorizeGroup(group);
      categorized[category].push(group);
    }

    // Default sort for active: groups needing attention first (live > unpredicted), then by nextGame.kickoffAt
    const defaultSort = (a: ApiGroupItem, b: ApiGroupItem) => {
      const attentionA = needsAttention(a);
      const attentionB = needsAttention(b);

      if (attentionA && !attentionB) return -1;
      if (!attentionA && attentionB) return 1;

      if (attentionA && attentionB) {
        const liveA = a.liveGamesCount ?? 0;
        const liveB = b.liveGamesCount ?? 0;
        if (liveA !== liveB) return liveB - liveA;
        const unpredA = a.todayUnpredictedCount ?? 0;
        const unpredB = b.todayUnpredictedCount ?? 0;
        if (unpredA !== unpredB) return unpredB - unpredA;
      }

      const ka = a.nextGame?.kickoffAt ?? null;
      const kb = b.nextGame?.kickoffAt ?? null;
      if (ka === null && kb === null) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      return ka.localeCompare(kb);
    };

    // Apply sort to each category
    const sortFn = (a: ApiGroupItem, b: ApiGroupItem): number => {
      switch (selectedSort) {
        case "recentlyAdded": {
          const ca = a.createdAt ?? "";
          const cb = b.createdAt ?? "";
          return cb.localeCompare(ca); // newest first
        }
        case "alphabetical":
          return (a.name ?? "").localeCompare(b.name ?? "");
        case "creator": {
          const roleOrder = { owner: 0, admin: 1, member: 2 };
          const ra = roleOrder[a.userRole as keyof typeof roleOrder] ?? 2;
          const rb = roleOrder[b.userRole as keyof typeof roleOrder] ?? 2;
          if (ra !== rb) return ra - rb;
          return defaultSort(a, b);
        }
        case "recents":
        default:
          return defaultSort(a, b);
      }
    };

    categorized.active.sort(sortFn);
    categorized.drafts.sort(sortFn);
    categorized.ended.sort(sortFn);

    const counts = {
      all: groups.length,
      active: categorized.active.length,
      drafts: categorized.drafts.length,
      ended: categorized.ended.length,
    };

    let filtered: ApiGroupItem[];
    if (selectedFilter === "all") {
      filtered = [
        ...categorized.active,
        ...categorized.drafts,
        ...categorized.ended,
      ];
    } else {
      filtered = categorized[selectedFilter];
    }

    return { filteredGroups: filtered, counts };
  }, [groups, selectedFilter, selectedSort]);

  // Auto-select first non-empty filter on initial load
  useEffect(() => {
    if (selectedFilter === "active" && counts.active === 0) {
      const firstNonEmpty = FILTER_PRIORITY.find((f) => counts[f] > 0);
      if (firstNonEmpty) {
        setSelectedFilter(firstNonEmpty);
      }
    }
  }, [counts, selectedFilter]);

  return {
    selectedFilter,
    setSelectedFilter,
    selectedSort,
    setSelectedSort,
    filteredGroups,
    counts,
  };
}
