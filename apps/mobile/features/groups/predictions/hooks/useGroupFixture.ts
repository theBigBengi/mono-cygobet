import { useMemo } from "react";
import { useGroupQuery } from "@/domains/groups";
import type { FixtureItem } from "@/types/common";

/**
 * Selects a single fixture from the group query cache.
 * Does NOT trigger a new fetch if group is already cached.
 */
export function useGroupFixture(
  groupId: number | null,
  fixtureId: number | null
) {
  const { data, isLoading, error } = useGroupQuery(groupId, {
    includeFixtures: true,
  });

  const fixtures = useMemo((): FixtureItem[] => {
    const list = data?.data?.fixtures;
    return Array.isArray(list) ? (list as FixtureItem[]) : [];
  }, [data?.data?.fixtures]);

  const fixture = useMemo(() => {
    if (!fixtureId || fixtures.length === 0) return null;
    return fixtures.find((f) => f.id === fixtureId) ?? null;
  }, [fixtures, fixtureId]);

  const fixtureIndex = useMemo(() => {
    if (!fixtureId || fixtures.length === 0) return -1;
    return fixtures.findIndex((f) => f.id === fixtureId);
  }, [fixtures, fixtureId]);

  const group = data?.data ?? null;

  return {
    fixture,
    fixtureIndex,
    allFixtures: fixtures,
    group,
    isLoading,
    error,
  };
}
