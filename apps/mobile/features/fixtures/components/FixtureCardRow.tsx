// features/fixtures/components/FixtureCardRow.tsx
// Memoized fixture card row with picks integration.
// Prevents unnecessary re-renders when other fixtures are selected.

import React, { memo } from "react";
import { FixtureCard } from "./FixtureCard";
import {
  usePickForFixture,
  useTogglePickHook,
} from "@/features/picks/picks.hooks";
import type { ApiFixturesListResponse } from "@repo/types";

type FixtureItem = ApiFixturesListResponse["data"][0];

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
