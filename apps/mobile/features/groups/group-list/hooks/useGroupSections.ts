// features/groups/group-list/hooks/useGroupSections.ts
// Hook to sort groups into sections for SectionList: attention, active, drafts, ended.

import { useMemo } from "react";
import type { ApiGroupItem } from "@repo/types";

export type GroupSection = {
  key: "attention" | "active" | "drafts" | "ended";
  title: string;
  data: ApiGroupItem[];
  collapsible?: boolean;
};

export function useGroupSections(groups: ApiGroupItem[]): {
  sections: GroupSection[];
  attentionCount: number;
} {
  return useMemo(() => {
    const attention: ApiGroupItem[] = [];
    const active: ApiGroupItem[] = [];
    const drafts: ApiGroupItem[] = [];
    const ended: ApiGroupItem[] = [];

    for (const g of groups) {
      if (g.status === "draft") {
        drafts.push(g);
      } else if (g.status === "ended") {
        ended.push(g);
      } else if (g.status === "active") {
        const live = (g.liveGamesCount ?? 0) > 0;
        const unpredicted = (g.todayUnpredictedCount ?? 0) > 0;
        if (live || unpredicted) {
          attention.push(g);
        } else {
          active.push(g);
        }
      }
    }

    // Active: sort by nextGame.kickoffAt ASC, nulls last
    active.sort((a, b) => {
      const ka = a.nextGame?.kickoffAt ?? null;
      const kb = b.nextGame?.kickoffAt ?? null;
      if (ka === null && kb === null) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      return ka.localeCompare(kb);
    });

    const sections: GroupSection[] = [];

    if (attention.length > 0) {
      sections.push({
        key: "attention",
        title: "Needs attention",
        data: attention,
      });
    }
    if (active.length > 0) {
      sections.push({
        key: "active",
        title: "Active",
        data: active,
      });
    }
    if (drafts.length > 0) {
      sections.push({
        key: "drafts",
        title: "Drafts",
        data: drafts,
      });
    }
    if (ended.length > 0) {
      sections.push({
        key: "ended",
        title: "Ended",
        data: ended,
        collapsible: true,
      });
    }

    return {
      sections,
      attentionCount: attention.length,
    };
  }, [groups]);
}
