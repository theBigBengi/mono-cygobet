/**
 * GroupFixtureCard — per-fixture wrapper for the predictions list.
 *
 * Thin wrapper around MatchPredictionCardVertical that:
 * - Computes positionInGroup (top/middle/bottom/single) for card styling.
 * - Decides if share is allowed (finished + settled prediction) and builds
 *   share text via formatPredictionForShare + buildPredictionShareText.
 * - Binds fixture.id into all callbacks (onFocus, onBlur, onChange, onAutoNext,
 *   onSelectOutcome) so the parent receives (fixtureId, ...) and doesn't need
 *   per-fixture closures in the render loop.
 *
 * Wrapped in React.memo so it re-renders only when fixture, prediction, focus,
 * or callback refs actually change.
 */
import React, { useCallback } from "react";
import { View, TextInput } from "react-native";
import { isFinished } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FocusedField } from "../types";
import { shareText, buildPredictionShareText } from "@/utils/sharing";
import { MatchPredictionCardVertical } from "./MatchPredictionCardVertical";
import { getPositionInGroup, formatPredictionForShare } from "../utils/utils";

/** Refs for home/away score inputs; keyed by fixture id string. */
type InputRefs = {
  home: React.RefObject<TextInput | null>;
  away: React.RefObject<TextInput | null>;
};

export type GroupFixtureCardProps = {
  fixture: FixtureItem;
  index: number;
  totalInGroup: number;
  prediction: GroupPrediction;
  inputRefs: React.MutableRefObject<Record<string, InputRefs>>;
  currentFocusedField: FocusedField;
  savedPredictions: Set<number>;
  matchCardRefs: React.MutableRefObject<
    Record<string, React.RefObject<View | null>>
  >;
  predictionMode: "CorrectScore" | "MatchWinner";
  groupName?: string;
  onFieldFocus: (fixtureId: number, type: "home" | "away") => void;
  onFieldBlur: (fixtureId: number) => void;
  onCardChange: (
    fixtureId: number,
    type: "home" | "away",
    text: string
  ) => void;
  onAutoNext: (fixtureId: number, type: "home" | "away") => void;
  onSelectOutcome?: (
    fixtureId: number,
    outcome: "home" | "draw" | "away"
  ) => void;
  onScrollToCard: (fixtureId: number) => void;
};

function GroupFixtureCardInner({
  fixture,
  index,
  totalInGroup,
  prediction,
  inputRefs,
  currentFocusedField,
  savedPredictions,
  matchCardRefs,
  predictionMode,
  groupName,
  onFieldFocus,
  onFieldBlur,
  onCardChange,
  onAutoNext,
  onSelectOutcome,
  onScrollToCard,
}: GroupFixtureCardProps) {
  /** Used for card border/radius styling (first/middle/last in group). */
  const positionInGroup = getPositionInGroup(index, totalInGroup);
  const cardRef = matchCardRefs.current[String(fixture.id)];

  /** Share only when match is finished and we have a settled prediction with points. */
  const canShare =
    Boolean(groupName) &&
    isFinished(fixture.state) &&
    fixture.prediction != null &&
    fixture.prediction.settled &&
    fixture.prediction.points != null;

  /** Open native share sheet with fixture name, prediction string, result, points. */
  const onShare = useCallback(() => {
    if (!canShare || !fixture.prediction || !groupName) return;
    const predictionStr = formatPredictionForShare(
      fixture.prediction,
      predictionMode
    );
    shareText(
      buildPredictionShareText({
        fixtureName:
          fixture.name ??
          `${fixture.homeTeam?.name ?? "Home"} vs ${fixture.awayTeam?.name ?? "Away"}`,
        prediction: predictionStr,
        actual: fixture.result ?? "-",
        points: fixture.prediction.points ?? 0,
        groupName,
      })
    );
  }, [canShare, fixture, groupName, predictionMode]);

  /** Bind fixture.id so parent gets (fixtureId, type); also scroll card into view. */
  const onFocus = useCallback(
    (type: "home" | "away") => {
      onFieldFocus(fixture.id, type);
      onScrollToCard(fixture.id);
    },
    [fixture.id, onFieldFocus, onScrollToCard]
  );

  /** Notify parent which fixture lost focus (for saving/focus state). */
  const onBlur = useCallback(() => {
    onFieldBlur(fixture.id);
  }, [fixture.id, onFieldBlur]);

  /** Forward score change with fixtureId so parent can update prediction and optionally move focus. */
  const onChange = useCallback(
    (type: "home" | "away", text: string) => {
      onCardChange(fixture.id, type, text);
    },
    [fixture.id, onCardChange]
  );

  /** Called when user fills max digits; move to next field (bind fixture.id). */
  const onAutoNextLocal = useCallback(
    (type: "home" | "away") => {
      onAutoNext(fixture.id, type);
    },
    [fixture.id, onAutoNext]
  );

  /** For MatchWinner: 1/X/2 selected; bind fixture.id for parent. */
  const onSelectOutcomeLocal = useCallback(
    (outcome: "home" | "draw" | "away") => {
      onSelectOutcome?.(fixture.id, outcome);
    },
    [fixture.id, onSelectOutcome]
  );

  /** Pass bound callbacks and share state into the presentational card. */
  return (
    <MatchPredictionCardVertical
      positionInGroup={positionInGroup}
      fixture={fixture}
      prediction={prediction}
      inputRefs={inputRefs}
      currentFocusedField={currentFocusedField}
      savedPredictions={savedPredictions}
      cardRef={cardRef}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChange}
      onAutoNext={onAutoNextLocal}
      predictionMode={predictionMode}
      onSelectOutcome={onSelectOutcome ? onSelectOutcomeLocal : undefined}
      onShare={canShare ? onShare : undefined}
      showShare={Boolean(canShare)}
    />
  );
}

/** Memoized so list items re-render only when their fixture/prediction/focus/callbacks change. */
export const GroupFixtureCard = React.memo(GroupFixtureCardInner);
