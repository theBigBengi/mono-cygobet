import { useMemo } from "react";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import type { FocusedField } from "../types";
import {
  getGameResultOrTime,
  getFixturePoints,
  getFixtureWinner,
  getCardBorderRadius,
  getCardBorderStyle,
} from "../utils/fixture-helpers";

type UseMatchCardStateParams = {
  fixture: FixtureItem;
  positionInGroup: PositionInGroup;
  currentFocusedField: FocusedField;
};

type UseMatchCardStateReturn = {
  isEditable: boolean;
  isLive: boolean;
  isFinished: boolean;
  isCancelled: boolean;
  gameResultOrTime: ReturnType<typeof getGameResultOrTime>;
  points: number | null;
  winner: "home" | "away" | "draw" | null;
  isHomeWinner: boolean;
  isAwayWinner: boolean;
  isHomeFocused: boolean;
  isAwayFocused: boolean;
  cardRadiusStyle: ReturnType<typeof getCardBorderRadius>;
  cardBorderStyle: ReturnType<typeof getCardBorderStyle>;
};

/**
 * Hook that encapsulates all derived state calculations for MatchPredictionCardVertical
 */
export function useMatchCardState({
  fixture,
  positionInGroup,
  currentFocusedField,
}: UseMatchCardStateParams): UseMatchCardStateReturn {
  return useMemo(() => {
    const isEditable = fixture.state === "NS";
    const isLive = fixture.state === "LIVE";
    const isFinished = fixture.state === "FT";
    const isCancelled = fixture.state !== "NS" && fixture.state !== "FT" && fixture.state !== "LIVE";

    const gameResultOrTime = getGameResultOrTime(fixture);
    const points = getFixturePoints(fixture);
    const winner = getFixtureWinner(isFinished, gameResultOrTime);

    const isHomeWinner = winner === "home";
    const isAwayWinner = winner === "away";

    const isHomeFocused =
      currentFocusedField?.fixtureId === fixture.id && currentFocusedField.type === "home";
    const isAwayFocused =
      currentFocusedField?.fixtureId === fixture.id && currentFocusedField.type === "away";

    const cardRadiusStyle = getCardBorderRadius(positionInGroup);
    const cardBorderStyle = getCardBorderStyle(positionInGroup);

    return {
      isEditable,
      isLive,
      isFinished,
      isCancelled,
      gameResultOrTime,
      points,
      winner,
      isHomeWinner,
      isAwayWinner,
      isHomeFocused,
      isAwayFocused,
      cardRadiusStyle,
      cardBorderStyle,
    };
  }, [fixture, positionInGroup, currentFocusedField]);
}
