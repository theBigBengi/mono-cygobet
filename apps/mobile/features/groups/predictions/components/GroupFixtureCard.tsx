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
import type { SharedValue } from "react-native-reanimated";
import { isFinished } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FocusedField, PredictionMode } from "../types";
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
  /** When true, this fixture's prediction is saved (no pending change). */
  isSaved?: boolean;
  /** When true, card is highlighted (e.g., after scroll navigation). */
  isHighlighted?: boolean;
  matchCardRefs: React.MutableRefObject<
    Record<string, React.RefObject<View | null>>
  >;
  predictionMode: PredictionMode;
  groupName?: string;
  /** Global match number for display (e.g., "1/12") */
  matchNumber?: string;
  /** Timeline: is this card in the filled (completed) zone? */
  timelineFilled?: boolean;
  /** Timeline: should the connector below this card be filled? */
  timelineConnectorFilled?: boolean;
  /** Timeline: first card in the list */
  isFirstInTimeline?: boolean;
  /** Timeline: last card in the list */
  isLastInTimeline?: boolean;
  /** When true, this is the next game the user should predict */
  isNextToPredict?: boolean;
  /** When true, this fixture earned maximum points (perfect prediction) */
  isMaxPoints?: boolean;
  /** Scroll position for reveal animation */
  scrollY?: SharedValue<number>;
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
  /** If provided, called when card is pressed instead of navigating to fixture detail. */
  onPressCard?: (fixtureId: number) => void;
};

function GroupFixtureCardInner({
  fixture,
  index,
  totalInGroup,
  prediction,
  inputRefs,
  currentFocusedField,
  isSaved = true,
  isHighlighted = false,
  matchCardRefs,
  predictionMode,
  groupName,
  matchNumber,
  timelineFilled,
  timelineConnectorFilled,
  isFirstInTimeline,
  isLastInTimeline,
  isNextToPredict,
  isMaxPoints,
  scrollY,
  onFieldFocus,
  onFieldBlur,
  onCardChange,
  onAutoNext,
  onSelectOutcome,
  onScrollToCard,
  onPressCard,
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

  /** Bind fixture.id so parent gets (fixtureId, type). Scroll handled by useEffect in parent. */
  const onFocus = useCallback(
    (type: "home" | "away") => {
      onFieldFocus(fixture.id, type);
    },
    [fixture.id, onFieldFocus]
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

  /** Stable press callback — avoids creating a new closure on every render. */
  const onPressCardLocal = useCallback(() => {
    onPressCard?.(fixture.id);
  }, [fixture.id, onPressCard]);

  /** Pass bound callbacks and share state into the presentational card. */
  return (
    <MatchPredictionCardVertical
      positionInGroup={positionInGroup}
      fixture={fixture}
      prediction={prediction}
      inputRefs={inputRefs}
      currentFocusedField={currentFocusedField}
      isSaved={Boolean(isSaved)}
      isHighlighted={isHighlighted}
      cardRef={cardRef}
      matchNumber={matchNumber}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChange}
      onAutoNext={onAutoNextLocal}
      predictionMode={predictionMode}
      onSelectOutcome={onSelectOutcome ? onSelectOutcomeLocal : undefined}
      onPressCard={onPressCard ? onPressCardLocal : undefined}
      showLeagueInfo={false}
      timelineFilled={timelineFilled}
      timelineConnectorFilled={timelineConnectorFilled}
      isFirstInTimeline={isFirstInTimeline}
      isLastInTimeline={isLastInTimeline}
      isNextToPredict={isNextToPredict}
      isMaxPoints={isMaxPoints}
      scrollY={scrollY}
    />
  );
}

/** Custom comparison to prevent re-renders when focus changes to unrelated fixture. */
function arePropsEqual(
  prevProps: GroupFixtureCardProps,
  nextProps: GroupFixtureCardProps
): boolean {
  // Check if focus state is relevant to this fixture
  const prevFocused = prevProps.currentFocusedField?.fixtureId === prevProps.fixture.id;
  const nextFocused = nextProps.currentFocusedField?.fixtureId === nextProps.fixture.id;

  // If focus relevance changed for this card, need to re-render
  if (prevFocused !== nextFocused) return false;

  // If this card is focused, check if the focus type changed (home/away)
  if (nextFocused && prevProps.currentFocusedField?.type !== nextProps.currentFocusedField?.type) {
    return false;
  }

  // Check other props that should trigger re-render
  if (prevProps.fixture !== nextProps.fixture) return false;

  // Shallow compare prediction object
  if (prevProps.prediction?.home !== nextProps.prediction?.home) return false;
  if (prevProps.prediction?.away !== nextProps.prediction?.away) return false;

  if (prevProps.isSaved !== nextProps.isSaved) return false;
  if (prevProps.isHighlighted !== nextProps.isHighlighted) return false;
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.totalInGroup !== nextProps.totalInGroup) return false;
  if (prevProps.predictionMode !== nextProps.predictionMode) return false;
  if (prevProps.timelineFilled !== nextProps.timelineFilled) return false;
  if (prevProps.timelineConnectorFilled !== nextProps.timelineConnectorFilled) return false;
  if (prevProps.isFirstInTimeline !== nextProps.isFirstInTimeline) return false;
  if (prevProps.isLastInTimeline !== nextProps.isLastInTimeline) return false;
  if (prevProps.isNextToPredict !== nextProps.isNextToPredict) return false;
  if (prevProps.isMaxPoints !== nextProps.isMaxPoints) return false;

  // Callbacks and refs are stable (from useCallback/useRef), no need to compare
  return true;
}

/** Memoized with custom comparison to prevent unnecessary re-renders. */
export const GroupFixtureCard = React.memo(GroupFixtureCardInner, arePropsEqual);
