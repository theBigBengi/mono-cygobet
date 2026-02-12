// features/groups/group-list/hooks/useGroupFilter.ts
// Hook to manage filter state and categorize/sort/filter groups for the tabbed list.

import { useState, useMemo } from "react";
import type { ApiGroupItem } from "@repo/types";

export type GroupFilterType =
  | "all"
  | "attention"
  | "active"
  | "drafts"
  | "ended";

interface GroupFilterResult {
  selectedFilter: GroupFilterType;
  setSelectedFilter: (filter: GroupFilterType) => void;
  filteredGroups: ApiGroupItem[];
  counts: {
    all: number;
    attention: number;
    active: number;
    drafts: number;
    ended: number;
  };
}

function categorizeGroup(
  group: ApiGroupItem
): "attention" | "active" | "drafts" | "ended" {
  if (group.status === "draft") return "drafts";
  if (group.status === "ended") return "ended";

  // Active group - check if needs attention
  const hasLive = (group.liveGamesCount ?? 0) > 0;
  const hasUnpredicted = (group.todayUnpredictedCount ?? 0) > 0;

  if (hasLive || hasUnpredicted) return "attention";
  return "active";
}

export function useGroupFilter(groups: ApiGroupItem[]): GroupFilterResult {
  const [selectedFilter, setSelectedFilter] = useState<GroupFilterType>("attention");

  const { filteredGroups, counts } = useMemo(() => {
    const categorized = {
      attention: [] as ApiGroupItem[],
      active: [] as ApiGroupItem[],
      drafts: [] as ApiGroupItem[],
      ended: [] as ApiGroupItem[],
    };

    for (const group of groups) {
      const category = categorizeGroup(group);
      categorized[category].push(group);
    }

    // Sort active by nextGame.kickoffAt ASC, nulls last
    categorized.active.sort((a, b) => {
      const ka = a.nextGame?.kickoffAt ?? null;
      const kb = b.nextGame?.kickoffAt ?? null;
      if (ka === null && kb === null) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      return ka.localeCompare(kb);
    });

    // Sort attention: live first, then by unpredicted count
    categorized.attention.sort((a, b) => {
      const liveA = a.liveGamesCount ?? 0;
      const liveB = b.liveGamesCount ?? 0;
      if (liveA !== liveB) return liveB - liveA;
      const unpredA = a.todayUnpredictedCount ?? 0;
      const unpredB = b.todayUnpredictedCount ?? 0;
      return unpredB - unpredA;
    });

    const counts = {
      all: groups.length,
      attention: categorized.attention.length,
      active: categorized.active.length,
      drafts: categorized.drafts.length,
      ended: categorized.ended.length,
    };

    let filtered: ApiGroupItem[];
    if (selectedFilter === "all") {
      filtered = [
        ...categorized.attention,
        ...categorized.active,
        ...categorized.drafts,
        ...categorized.ended,
      ];
    } else {
      filtered = categorized[selectedFilter];
    }

    return { filteredGroups: filtered, counts };
  }, [groups, selectedFilter]);

  return {
    selectedFilter,
    setSelectedFilter,
    filteredGroups,
    counts,
  };
}
