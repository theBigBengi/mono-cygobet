// components/Fixtures/UpcomingFixtureCardRow.tsx
// Memoized row using UpcomingFixtureCard with picks integration.

import React, { memo } from "react";
import type { ApiFixturesListResponse } from "@repo/types";
import {
  usePickForFixture,
  useTogglePickHook,
} from "@/features/picks/picks.hooks";
import { FixtureCard } from "./FixtureCard";

type FixtureItem = ApiFixturesListResponse["data"][0];

interface UpcomingFixtureCardRowProps {
  fixture: FixtureItem;
}

function UpcomingFixtureCardRowComponent({
  fixture,
}: UpcomingFixtureCardRowProps) {
  const selectedPick = usePickForFixture(fixture.id);
  const togglePick = useTogglePickHook();

  const handlePick = (pick: "1" | "X" | "2") => {
    console.log("[UpcomingFixtureCardRow] handlePick called", {
      fixtureId: fixture.id,
      pick,
      startTs: fixture.startTs,
    });
    try {
      if (!fixture.startTs || typeof fixture.startTs !== "number") {
        console.error(
          "[UpcomingFixtureCardRow] Invalid startTs:",
          fixture.startTs
        );
        return;
      }
      togglePick(fixture.id, pick, fixture.startTs).catch((error) => {
        console.error("[UpcomingFixtureCardRow] Error toggling pick:", error);
      });
    } catch (error) {
      console.error("[UpcomingFixtureCardRow] Error in handlePick:", error);
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

export const UpcomingFixtureCardRow = memo(UpcomingFixtureCardRowComponent);
