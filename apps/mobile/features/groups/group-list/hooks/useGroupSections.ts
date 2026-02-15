// features/groups/group-list/hooks/useGroupSections.ts
// Hook to sort groups into sections for SectionList: active, drafts, ended.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ApiGroupItem } from "@repo/types";

export type GroupSection = {
  key: "active" | "drafts" | "ended";
  title: string;
  data: ApiGroupItem[];
  collapsible?: boolean;
};

function needsAttention(group: ApiGroupItem): boolean {
  const hasLive = (group.liveGamesCount ?? 0) > 0;
  const hasUnpredicted = (group.todayUnpredictedCount ?? 0) > 0;
  return hasLive || hasUnpredicted;
}

export function useGroupSections(groups: ApiGroupItem[]): {
  sections: GroupSection[];
} {
  const { t } = useTranslation("common");
  return useMemo(() => {
    const active: ApiGroupItem[] = [];
    const drafts: ApiGroupItem[] = [];
    const ended: ApiGroupItem[] = [];

    for (const g of groups) {
      if (g.status === "draft") {
        drafts.push(g);
      } else if (g.status === "ended") {
        ended.push(g);
      } else if (g.status === "active") {
        active.push(g);
      }
    }

    // Sort active: groups needing attention first (live > unpredicted), then by nextGame.kickoffAt
    active.sort((a, b) => {
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

    const sections: GroupSection[] = [];

    if (active.length > 0) {
      sections.push({
        key: "active",
        title: t("groups.active"),
        data: active,
      });
    }
    if (drafts.length > 0) {
      sections.push({
        key: "drafts",
        title: t("groups.drafts"),
        data: drafts,
      });
    }
    if (ended.length > 0) {
      sections.push({
        key: "ended",
        title: t("groups.ended"),
        data: ended,
        collapsible: true,
      });
    }

    return { sections };
  }, [groups, t]);
}
