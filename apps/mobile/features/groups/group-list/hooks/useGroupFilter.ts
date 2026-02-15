// features/groups/group-list/hooks/useGroupFilter.ts
// Hook to manage filter state and categorize/sort/filter groups for the tabbed list.

import { useState, useMemo, useEffect } from "react";
import type { ApiGroupItem } from "@repo/types";

export type GroupFilterType =
  | "all"
  | "active"
  | "drafts"
  | "ended";

const FILTER_PRIORITY: Exclude<GroupFilterType, "all">[] = [
  "active",
  "drafts",
  "ended",
];

interface GroupFilterResult {
  selectedFilter: GroupFilterType;
  setSelectedFilter: (filter: GroupFilterType) => void;
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

    // Sort active: groups needing attention first (live > unpredicted), then by nextGame.kickoffAt
    categorized.active.sort((a, b) => {
      const attentionA = needsAttention(a);
      const attentionB = needsAttention(b);

      // Attention groups come first
      if (attentionA && !attentionB) return -1;
      if (!attentionA && attentionB) return 1;

      // Within attention groups: live first, then by unpredicted count
      if (attentionA && attentionB) {
        const liveA = a.liveGamesCount ?? 0;
        const liveB = b.liveGamesCount ?? 0;
        if (liveA !== liveB) return liveB - liveA;
        const unpredA = a.todayUnpredictedCount ?? 0;
        const unpredB = b.todayUnpredictedCount ?? 0;
        if (unpredA !== unpredB) return unpredB - unpredA;
      }

      // Then sort by nextGame.kickoffAt ASC, nulls last
      const ka = a.nextGame?.kickoffAt ?? null;
      const kb = b.nextGame?.kickoffAt ?? null;
      if (ka === null && kb === null) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      return ka.localeCompare(kb);
    });

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
  }, [groups, selectedFilter]);

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
    filteredGroups,
    counts,
  };
}
