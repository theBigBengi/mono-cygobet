// features/fixtures/components/FixtureCardRow.tsx
// Memoized fixture card row with picks integration.
// Prevents unnecessary re-renders when other fixtures are selected.

import React, { memo } from "react";
import { FixtureCard } from "./FixtureCard";
import {
  usePickForFixture,
  useTogglePickHook,
} from "@/features/picks/picks.hooks";

type FixtureItem = {
  id: number;
  kickoffAt: string;
  league?: { name?: string | null; imagePath?: string | null } | null;
  homeTeam?: {
    id: number;
    name?: string | null;
    imagePath?: string | null;
  } | null;
  awayTeam?: {
    id: number;
    name?: string | null;
    imagePath?: string | null;
  } | null;
  odds?:
    | {
        id: number;
        value: string;
        label: string;
        marketName: string | null;
        probability: string | null;
        winning: boolean;
        name: string | null;
        handicap: string | null;
        total: string | null;
        sortOrder: number;
      }[]
    | null;
};

interface FixtureCardRowProps {
  fixture: FixtureItem;
}

function FixtureCardRowComponent({ fixture }: FixtureCardRowProps) {
  const selectedPick = usePickForFixture(fixture.id);
  const togglePick = useTogglePickHook();

  const handlePick = (pick: "1" | "X" | "2") => {
    togglePick(fixture.id, pick);
  };

  return (
    <FixtureCard
      fixture={fixture}
      selectedPick={selectedPick}
      onPick={handlePick}
    />
  );
}

// Memoize to prevent re-renders when other fixtures' picks change
export const FixtureCardRow = memo(FixtureCardRowComponent);
