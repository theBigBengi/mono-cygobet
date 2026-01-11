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
    console.log("[FixtureCardRow] handlePick called", {
      fixtureId: fixture.id,
      pick,
      startTs: fixture.startTs,
    });
    try {
      // Validate fixture.startTs exists
      if (!fixture.startTs || typeof fixture.startTs !== "number") {
        console.error("[FixtureCardRow] Invalid startTs:", fixture.startTs);
        return;
      }
      // Pass kickoffTs from fixture.startTs (Unix seconds)
      togglePick(fixture.id, pick, fixture.startTs).catch((error) => {
        console.error("[FixtureCardRow] Error toggling pick:", error);
      });
    } catch (error) {
      console.error("[FixtureCardRow] Error in handlePick:", error);
    }
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
// The component will re-render when:
// - fixture prop changes (different fixture)
// - This fixture's pick changes (handled by usePickForFixture subscription)
export const FixtureCardRow = memo(FixtureCardRowComponent);
