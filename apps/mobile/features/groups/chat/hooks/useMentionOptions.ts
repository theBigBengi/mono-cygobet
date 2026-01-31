// features/groups/chat/hooks/useMentionOptions.ts
// Transforms group members and fixtures into MentionOption[] for the picker.

import { useMemo } from "react";
import { useGroupMembersQuery } from "@/domains/groups";
import type { MentionOption } from "../components/MentionPicker";
import type { FixtureItem } from "@/features/groups/group-lobby";

export function useMentionOptions(
  groupId: number | null,
  fixtures: FixtureItem[]
) {
  const { data: membersData } = useGroupMembersQuery(groupId);

  const memberOptions: MentionOption[] = useMemo(() => {
    const members = membersData?.data ?? [];
    return members
      .filter((m) => m.username)
      .map((m) => ({
        type: "user" as const,
        id: m.userId,
        display: m.username!,
      }));
  }, [membersData]);

  const fixtureOptions: MentionOption[] = useMemo(() => {
    return fixtures
      .filter((f) => f.homeTeam && f.awayTeam)
      .map((f) => ({
        type: "fixture" as const,
        id: f.id,
        display: `${f.homeTeam!.name} vs ${f.awayTeam!.name}`,
      }));
  }, [fixtures]);

  return { memberOptions, fixtureOptions };
}
