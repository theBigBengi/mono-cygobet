import { useMemo } from "react";
import { useMyGroupsQuery } from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";

export function usePredictableGroups() {
  const { data, isLoading } = useMyGroupsQuery();
  const allGroups = data?.data ?? [];

  const groups = useMemo<ApiGroupItem[]>(() => {
    return allGroups
      .filter(
        (g) =>
          g.status === "active" && (g.unpredictedGamesCount ?? 0) > 0
      )
      .sort(
        (a, b) =>
          (b.todayUnpredictedCount ?? 0) - (a.todayUnpredictedCount ?? 0)
      );
  }, [allGroups]);

  const totalUnpredicted = useMemo(
    () => groups.reduce((sum, g) => sum + (g.unpredictedGamesCount ?? 0), 0),
    [groups]
  );

  return {
    groups,
    totalUnpredicted,
    totalGroups: groups.length,
    isLoading,
  };
}
