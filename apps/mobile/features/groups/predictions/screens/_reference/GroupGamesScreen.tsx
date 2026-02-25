import React, { useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Keyboard, Alert, Text, InteractionManager, Pressable, Dimensions, type ListRenderItemInfo } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedReaction, useAnimatedStyle, runOnJS, clamp, withTiming, withSpring, interpolate, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  ScoreInputNavigationBar,
  SmartFilterChips,
  GroupFixtureCard,
  GamesSummaryCard,
} from "../components";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePredictionNavigation } from "../hooks/usePredictionNavigation";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import { useSmartFilters } from "../hooks/useSmartFilters";
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import type { PredictionMode, FixtureItem, RenderItem } from "../types";
import { GroupGamesLastSavedFooter } from "../components/GroupGamesLastSavedFooter";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { GroupGamesSkeleton } from "../components/GroupGamesSkeleton";
import { isFinished as isFinishedState, isLive as isLiveState, isCancelled as isCancelledState } from "@repo/utils";
import { HEADER_HEIGHT, FOOTER_PADDING, SAVE_PENDING_DELAY_MS, SCROLL_OFFSET, TIMELINE } from "../utils/constants";

type Props = {
  groupId: number | null;
  /** Fixtures passed from parent (already fetched with group). */
  fixtures: FixtureItem[];
  predictionMode?: PredictionMode;
  groupName?: string;
  selectionMode?: "games" | "teams" | "leagues";
  groupTeamsIds?: number[];
  /** Index to scroll to on mount (deprecated - use scrollToFixtureId) */
  scrollToIndex?: number;
  /** Fixture ID to scroll to on mount (preferred over scrollToIndex) */
  scrollToFixtureId?: number;
  /** Maximum points for a perfect prediction (from group rules). */
  maxPossiblePoints?: number;
};

/**
 * Feature screen for group games score predictions.
 *
 * This file keeps only high-level orchestration:
 * - Normalises fixtures from props and applies filters (teams/rounds/actions).
 * - Groups fixtures by league/date and manages prediction state (local + save).
 * - Wires keyboard height, focus saving, and prev/next field navigation.
 * - Renders list view (FlatList + GroupFixtureCard per fixture); card press
 *   navigates to dedicated single-game route. Handlers are memoized so fixture cards
 *   re-render only when their props change.
 */
export function GroupGamesScreen({
  groupId,
  fixtures: fixturesProp,
  predictionMode,
  groupName,
  selectionMode,
  groupTeamsIds,
  scrollToIndex,
  scrollToFixtureId,
  maxPossiblePoints,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const mode = selectionMode ?? "games";

  /** Defer heavy content rendering until navigation animation finishes. */
  const [isReady, setIsReady] = React.useState(false);
  React.useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      // Ensure skeleton is painted for at least one frame before loading content
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    });
    return () => handle.cancel();
  }, []);

  /** Normalise fixtures from props; ensure we always have an array. */
  const fixtures = useMemo(() => {
    return Array.isArray(fixturesProp) ? fixturesProp : [];
  }, [fixturesProp]);

  const navigateToLeaderboard = React.useCallback(() => {
    if (groupId != null) {
      router.push(`/groups/${groupId}/ranking`);
    }
  }, [groupId, router]);

  /** Filter chips (teams, rounds, actions) and empty-state messaging. */
  const {
    actionChips,
    selectedAction,
    selectAction,
    structuralFilter,
    selectTeam,
    selectCompetition,
    selectRound,
    navigateRound,
    filteredFixtures,
    hasAnyChips,
    emptyState,
  } = useSmartFilters({
    fixtures,
    mode,
    groupTeamsIds,
    onNavigateToLeaderboard: navigateToLeaderboard,
  });

  /** Fixtures grouped based on selection mode; LIVE fixtures are separated. */
  /** In leagues mode with round filter active, skip grouping (flat list) */
  const skipGrouping = mode === "leagues" && selectedAction === "round";
  const fixtureGroups = useGroupedFixtures({
    fixtures: filteredFixtures,
    mode,
    skipGrouping,
    groupTeamsIds,
  });

  /** Shared prediction state (React Query cache), save-to-server, and MatchWinner 1/X/2. */
  const {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    setOutcomePrediction,
    getFillRandomConfirm,
    fillRandomPredictions,
    saveAllPending,
    isSaving,
    pending,
  } = useGroupPredictions({
    groupId,
    predictionMode,
  });

  /** Show confirmation if needed, then fill random. Caller shows alerts using t(). */
  const handleFillRandom = useCallback(() => {
    const confirmInfo = getFillRandomConfirm();
    const fixtureIds = filteredFixtures.map((f) => f.id);
    if (confirmInfo !== null) {
      Alert.alert(
        t("predictions.fillRandom"),
        t("predictions.fillRandomOverwrite", {
          count: confirmInfo.existingCount,
        }),
        [
          { text: t("groups.cancel"), style: "cancel" },
          {
            text: t("predictions.fill"),
            onPress: () => fillRandomPredictions(fixtureIds, true),
          },
        ]
      );
    } else {
      fillRandomPredictions(fixtureIds, true);
    }
  }, [getFillRandomConfirm, fillRandomPredictions, filteredFixtures, t]);

  /** Save all pending predictions; show alert on error. */
  const handleSaveAllChanged = useCallback(() => {
    saveAllPending().catch(() => {
      Alert.alert(
        t("predictions.saveFailed"),
        t("predictions.saveFailedMessage")
      );
    });
  }, [saveAllPending, t]);

  const predictionModeTyped = predictionMode ?? "CorrectScore";

  /** Memoized map of global match numbers in "x/y" format. */
  const matchNumbersMap = useMemo(() => {
    const map: Record<number, string> = {};
    let globalIndex = 1;
    let totalCount = 0;
    fixtureGroups.forEach((group) => {
      totalCount += group.fixtures.length;
    });
    fixtureGroups.forEach((group) => {
      group.fixtures.forEach((fixture) => {
        map[fixture.id] = `${globalIndex++}/${totalCount}`;
      });
    });
    return map;
  }, [fixtureGroups]);

  /** Max possible points for a perfect prediction (from group rules). */
  const maxPoints = maxPossiblePoints ?? 0;

  const renderItems = useMemo((): RenderItem[] => {
    // 1. Flatten all fixtures to compute progress front
    const allFixtures: FixtureItem[] = [];
    fixtureGroups.forEach((g) => g.fixtures.forEach((f) => allFixtures.push(f)));

    let lastFinishedIdx = -1;
    for (let i = allFixtures.length - 1; i >= 0; i--) {
      const state = allFixtures[i].state;
      if (state && isFinishedState(state)) {
        lastFinishedIdx = i;
        break;
      }
    }

    // Extend fill to the first live match (line reaches it but doesn't fill through)
    let firstLiveIdx = -1;
    const searchFrom = lastFinishedIdx >= 0 ? lastFinishedIdx + 1 : 0;
    if (searchFrom < allFixtures.length) {
      const nextState = allFixtures[searchFrom].state;
      if (nextState && isLiveState(nextState)) {
        firstLiveIdx = searchFrom;
      }
    }

    const lastFilledIdx = firstLiveIdx >= 0 ? firstLiveIdx : lastFinishedIdx;

    // Per-fixture timeline state
    const filled: Record<number, boolean> = {};
    const connector: Record<number, boolean> = {};
    allFixtures.forEach((f, i) => {
      filled[f.id] = i <= lastFilledIdx;
      // Connector fills between cards, but NOT after the first live match
      connector[f.id] = i < lastFilledIdx && i < (firstLiveIdx >= 0 ? firstLiveIdx : lastFilledIdx + 1);
    });

    // 2. Build flat render list
    const items: RenderItem[] = [];
    for (const group of fixtureGroups) {
      if (group.fixtures.length === 0 && group.label) {
        // Date-only header (no fixtures in this group)
        items.push({
          type: "header",
          key: group.key,
          label: group.dateLabel || group.label,
          level: "date",
          isLive: group.isLive,
          showTrack: false,
          isFilled: false,
        });
      } else if (group.fixtures.length > 0 && group.label) {
        // League/round header (group has fixtures — header shown above them)
        items.push({
          type: "header",
          key: `header-${group.key}`,
          label: group.label,
          level: group.level ?? "league",
          isLive: group.isLive,
          round: group.fixtures[0]?.round,
          showTrack: false,
          isFilled: false,
        });
      }
      for (let i = 0; i < group.fixtures.length; i++) {
        items.push({
          type: "card",
          fixture: group.fixtures[i],
          group,
          indexInGroup: i,
          timelineFilled: filled[group.fixtures[i].id] ?? false,
          timelineConnectorFilled: connector[group.fixtures[i].id] ?? false,
          isFirstInTimeline: false, // filled below
          isLastInTimeline: false,
        });
      }
    }

    // 3. Compute timeline state for every item (single O(n) pass)
    // Start as true since the summary card is always above the first card
    let seenFirstCard = true;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type === "header") {
        item.showTrack = seenFirstCard;
        let nextFilled = false;
        for (let j = i + 1; j < items.length; j++) {
          if (items[j].type === "card") {
            nextFilled = (items[j] as any).timelineFilled;
            break;
          }
        }
        item.isFilled = nextFilled;
      } else {
        item.isFirstInTimeline = !seenFirstCard;
        item.isLastInTimeline = i === items.length - 1;
        seenFirstCard = true;
      }
    }

    return items;
  }, [fixtureGroups]);

  /** Build fixture→index map so usePredictionNavigation can scrollToIndex. */
  React.useEffect(() => {
    const map = new Map<number, number>();
    renderItems.forEach((item, i) => {
      if (item.type === "card") {
        map.set(item.fixture.id, i);
      }
    });
    updateFixtureIndexMap(map);
  }, [renderItems, updateFixtureIndexMap]);

  /** Whether any card in the timeline has a fill (for summary card connector). */
  const hasFilledCards = renderItems.some(
    (item) => item.type === "card" && item.timelineFilled
  );

  /** Summary stats for the summary card. */
  const summaryStats = useMemo(() => {
    let totalPoints = 0;
    let settledWithPoints = 0;
    let totalSettled = 0;

    filteredFixtures.forEach((f) => {
      if (f.prediction?.points != null && f.prediction.points > 0) {
        totalPoints += f.prediction.points;
        settledWithPoints++;
      }
      if (f.prediction?.settled) {
        totalSettled++;
      }
    });

    const accuracy =
      totalSettled > 0
        ? Math.round((settledWithPoints / totalSettled) * 100)
        : 0;
    return { totalPoints, accuracy };
  }, [filteredFixtures]);

  /** Next fixture — first upcoming game that hasn't started yet. */
  const nextToPredictId = useMemo(() => {
    const allFixtures: FixtureItem[] = [];
    fixtureGroups.forEach((g) =>
      g.fixtures.forEach((f) => allFixtures.push(f))
    );
    for (const f of allFixtures) {
      const state = f.state;
      if (state && (isFinishedState(state) || isLiveState(state) || isCancelledState(state))) continue;
      return f.id;
    }
    return null;
  }, [fixtureGroups]);

  /** For MatchWinner mode: set 1/X/2 and trigger a save shortly after. */
  const handleSelectOutcome = React.useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fixtureId, outcome);
      setTimeout(() => handleSaveAllChanged(), SAVE_PENDING_DELAY_MS);
    },
    [setOutcomePrediction, handleSaveAllChanged]
  );

  /** Stats for footer: last saved time, saved count, total count. */
  const { latestUpdatedAt, savedPredictionsCount, totalPredictionsCount } =
    usePredictionsStats({ fixtures: filteredFixtures });

  /** Refs for inputs/cards, scroll ref, focus state, prev/next and scroll-to-card. */
  const {
    inputRefs,
    matchCardRefs,
    flatListRef,
    updateFixtureIndexMap,
    currentFocusedField,
    setCurrentFocusedField,
    isNavigatingRef,
    isNavigatingSV,
    handlePrevious,
    handleNext,
    canGoPrevious,
    canGoNext,
    getNextFieldIndex,
    navigateToField,
    scrollToMatchCard,
  } = usePredictionNavigation(fixtureGroups);

  /** Filter panel animation value. */
  const filterAnim = useSharedValue(0);

  /** Scroll position for card reveal animations. */
  const scrollY = useSharedValue(0);
  /** Collapsing header: track previous scroll position and header offset. */
  const previousScrollY = useSharedValue(0);
  const headerOffset = useSharedValue(0);
  const totalHeaderH = HEADER_HEIGHT + insets.top;
  /** True only while the user is physically dragging the list. */
  const isUserDragging = useSharedValue(false);

  const animatedScrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => { isUserDragging.value = true; },
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const maxScrollY = event.contentSize.height - event.layoutMeasurement.height;

      scrollY.value = currentY;

      // Lock header in place when filter panel is open
      if (filterAnim.value > 0.5) {
        headerOffset.value = 0;
        previousScrollY.value = clamp(currentY, 0, maxScrollY);
        return;
      }

      // Collapsing header: react to user drag normally (show/hide).
      // During programmatic navigation: only allow HIDING (scroll up → hide header),
      // never showing — so jumping to earlier fixtures collapses the header.
      const delta = previousScrollY.value - currentY;
      if (isUserDragging.value) {
        headerOffset.value = clamp(
          headerOffset.value + delta,
          -totalHeaderH,
          0,
        );
      }

      previousScrollY.value = clamp(currentY, 0, maxScrollY);
    },
    onMomentumEnd: () => {
      isUserDragging.value = false;
      if (filterAnim.value > 0.5) return;

      // Snap to fully visible or fully hidden
      if (headerOffset.value > -totalHeaderH / 2) {
        headerOffset.value = withTiming(0, { duration: 200 });
      } else {
        headerOffset.value = withTiming(-totalHeaderH, { duration: 200 });
      }
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerOffset.value }],
  }));

  /** Scroll button follows header and panel expansion. */
  const scrollBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: clamp(headerOffset.value, -HEADER_HEIGHT, 0) +
        interpolate(filterAnim.value, [0, 1], [0, 120]),
    }],
  }));

  /** Track next-to-predict card visibility for floating scroll button. */
  const VIEWPORT_H = Dimensions.get("window").height;
  const nextCardY = useSharedValue(-1);
  const [scrollBtnDir, setScrollBtnDir] = React.useState<"up" | "down" | null>(null);

  // Measure the next-to-predict card position after layout
  React.useEffect(() => {
    if (!nextToPredictId || !isReady) {
      nextCardY.value = -1;
      setScrollBtnDir(null);
      return;
    }
    const timer = setTimeout(() => {
      const cardRef = matchCardRefs.current[String(nextToPredictId)];
      if (cardRef?.current) {
        cardRef.current.measureInWindow((_x: number, screenY: number) => {
          if (screenY != null) {
            nextCardY.value = screenY + scrollY.value;
          }
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [nextToPredictId, isReady, matchCardRefs, scrollY, nextCardY]);

  // Track previous direction on UI thread to avoid redundant runOnJS bridge calls.
  // 0 = null, 1 = "up", 2 = "down"
  const prevBtnDir = useSharedValue(0);

  // Check visibility on every scroll frame — only bridge when direction changes
  useAnimatedReaction(
    () => ({ scroll: scrollY.value, cardY: nextCardY.value }),
    ({ scroll, cardY }) => {
      let nextDir = 0; // null
      if (cardY >= 0) {
        const CARD_HEIGHT = 140;
        const viewportTop = scroll + HEADER_HEIGHT + insets.top;
        const viewportBottom = scroll + VIEWPORT_H;
        if (cardY + CARD_HEIGHT < viewportTop) {
          nextDir = 1; // "up"
        } else if (cardY > viewportBottom) {
          nextDir = 2; // "down"
        }
      }
      if (nextDir !== prevBtnDir.value) {
        prevBtnDir.value = nextDir;
        runOnJS(setScrollBtnDir)(nextDir === 0 ? null : nextDir === 1 ? "up" : "down");
      }
    }
  );

  const handleScrollToNext = useCallback(() => {
    if (nextToPredictId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollToMatchCard(nextToPredictId);
    }
  }, [nextToPredictId, scrollToMatchCard]);

  const keyboardHeight = useKeyboardHeight();

  /** Persist focus in state so nav bar and scroll-to-card know current field. */
  const { handleFieldFocus, handleFieldBlur } = useCardFocusSaving({
    currentFocusedField,
    setCurrentFocusedField,
    isNavigatingRef,
  });

  /** O(1) fixture lookup by id — rebuilt only when fixtures change (data load). */
  const fixturesById = useMemo(() => {
    const map = new Map<number, FixtureItem>();
    fixtures.forEach((f) => map.set(f.id, f));
    return map;
  }, [fixtures]);

  /** Get focused team info for navigation bar. */
  const focusedTeamInfo = useMemo(() => {
    if (!currentFocusedField) return null;
    const fixture = fixturesById.get(currentFocusedField.fixtureId);
    if (!fixture) return null;
    const team = currentFocusedField.type === "home" ? fixture.homeTeam : fixture.awayTeam;
    return {
      name: team?.name ?? "",
      logo: team?.imagePath ?? null,
    };
  }, [currentFocusedField, fixturesById]);

  /** Save pending predictions when keyboard hides (tap outside or system dismiss). */
  React.useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => handleSaveAllChanged()
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [handleSaveAllChanged]);

  /** Collapse header whenever a field receives focus. */
  React.useEffect(() => {
    if (currentFocusedField) {
      headerOffset.value = withTiming(-totalHeaderH, { duration: 200 });
    }
  }, [currentFocusedField, headerOffset, totalHeaderH]);

  /** Scroll to focused card when keyboard first appears (user taps a field directly).
   *  Programmatic navigation (prev/next/autoNext) already calls scrollToMatchCard,
   *  so we only scroll here when the keyboard pops up for a fresh tap. */
  const lastKeyboardHeightRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (currentFocusedField && !isNavigatingRef.current) {
      const keyboardJustAppeared = lastKeyboardHeightRef.current === 0 && keyboardHeight > 0;
      if (keyboardJustAppeared) {
        scrollToMatchCard(currentFocusedField.fixtureId);
      }
    }
    lastKeyboardHeightRef.current = currentFocusedField ? keyboardHeight : 0;
  }, [currentFocusedField, keyboardHeight, scrollToMatchCard, isNavigatingRef]);

  /** Create input/card refs for each fixture so cards can focus and scroll. */
  React.useEffect(() => {
    fixtures.forEach((fixture) => {
      const fixtureIdStr = String(fixture.id);
      if (!inputRefs.current[fixtureIdStr]) {
        inputRefs.current[fixtureIdStr] = {
          home: React.createRef(),
          away: React.createRef(),
        };
      }
      if (!matchCardRefs.current[fixtureIdStr]) {
        matchCardRefs.current[fixtureIdStr] = React.createRef();
      }
    });
  }, [fixtures, inputRefs, matchCardRefs]);

  // Track if initial scroll was done
  const initialScrollDone = React.useRef(false);
  // Track highlighted fixture for visual feedback after scroll
  const [highlightedFixtureId, setHighlightedFixtureId] = React.useState<number | null>(null);

  // ── Ref-bridges: renderItem reads from refs so its deps stay stable ──
  const currentFocusedFieldRef = useRef(currentFocusedField);
  currentFocusedFieldRef.current = currentFocusedField;
  const highlightedFixtureIdRef = useRef(highlightedFixtureId);
  highlightedFixtureIdRef.current = highlightedFixtureId;
  const nextToPredictIdRef = useRef(nextToPredictId);
  nextToPredictIdRef.current = nextToPredictId;

  /** Extra-data trigger: when any hot value changes, FlatList re-calls renderItem
   *  (which reads fresh values from refs). React.memo on GroupFixtureCard still
   *  prevents unnecessary card re-renders. */
  const flatListExtraData = useMemo(
    () => ({ pending, currentFocusedField, highlightedFixtureId, nextToPredictId }),
    [pending, currentFocusedField, highlightedFixtureId, nextToPredictId]
  );

  // Scroll to specific fixture on mount (only once, after cards are rendered)
  React.useEffect(() => {
    if (scrollToFixtureId == null || !isReady) return;
    if (initialScrollDone.current) return;

    initialScrollDone.current = true;

    // Small delay to ensure cards are laid out after isReady
    setTimeout(() => {
      scrollToMatchCard(scrollToFixtureId);
      // Just scroll, no highlight
    }, 100);
  }, [scrollToFixtureId, isReady, scrollToMatchCard]);

  /** Save all changed predictions then dismiss keyboard (Done button). */
  const handleDone = useCallback(() => {
    handleSaveAllChanged();
    Keyboard.dismiss();
  }, [handleSaveAllChanged]);

  const handleBack = useCallback(() => router.back(), [router]);

  /** Expandable filters panel. */
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const FILTER_PANEL_H = 120;


  /** Save pending then navigate to dedicated single game screen. */
  const handlePressCard = useCallback(
    (fixtureId: number) => {
      if (groupId != null) {
        saveAllPending();
        router.push(`/groups/${groupId}/fixtures/${fixtureId}`);
      }
    },
    [groupId, router, saveAllPending]
  );

  /** Update prediction for a field. Navigation is handled by handleAutoNext. */
  const handleCardChange = useCallback(
    (fixtureId: number, type: "home" | "away", text: string) => {
      updatePrediction(fixtureId, type, text);
    },
    [updatePrediction]
  );

  /** Move focus to the next input (e.g. after max digits in score field). */
  const handleAutoNext = useCallback(
    (fixtureId: number, type: "home" | "away") => {
      const nextIndex = getNextFieldIndex(fixtureId, type);
      if (nextIndex >= 0) navigateToField(nextIndex);
    },
    [getNextFieldIndex, navigateToField]
  );

  /** FlatList keyExtractor — stable key for each render item. */
  const flatListKeyExtractor = useCallback((item: RenderItem) => {
    return item.type === "header" ? item.key : String(item.fixture.id);
  }, []);

  /** FlatList renderItem — same JSX as the old .map() callback. */
  const flatListRenderItem = useCallback(
    ({ item }: ListRenderItemInfo<RenderItem>) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTimelineCol}>
              {item.showTrack && item.isFilled && (
                <View
                  style={{
                    position: "absolute",
                    left: (TIMELINE.TRACK_WIDTH - TIMELINE.LINE_WIDTH) / 2,
                    top: -1,
                    bottom: -1,
                    width: TIMELINE.LINE_WIDTH,
                    backgroundColor: theme.colors.primary,
                  }}
                />
              )}
            </View>
            <View style={styles.sectionHeaderContent}>
              {item.isLive ? (
                <View style={styles.sectionLiveBadge}>
                  <View style={styles.sectionLiveDot} />
                  <Text style={styles.sectionLiveText}>LIVE</Text>
                </View>
              ) : item.level === "date" ? (
                <View style={styles.sectionDateRow}>
                  <View style={[styles.sectionDateLine, { backgroundColor: theme.colors.primary + "30" }]} />
                  <Text
                    style={[
                      styles.sectionDateLabel,
                      { color: theme.colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <View style={[styles.sectionDateLine, { backgroundColor: theme.colors.primary + "30" }]} />
                </View>
              ) : (
                <View style={[styles.sectionLeaguePill, { backgroundColor: theme.colors.textSecondary + "0C", borderColor: theme.colors.textSecondary + "15" }]}>
                  <Text
                    style={[
                      styles.sectionLeagueLabel,
                      { color: theme.colors.textSecondary + "B0" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}{item.round ? `  ·  R${item.round}` : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }

      const { fixture, group, indexInGroup } = item;
      return (
        <GroupFixtureCard
          fixture={fixture}
          index={indexInGroup}
          totalInGroup={group.fixtures.length}
          prediction={getPrediction(fixture.id)}
          inputRefs={inputRefs}
          currentFocusedField={currentFocusedFieldRef.current}
          isSaved={isPredictionSaved(fixture.id)}
          isHighlighted={highlightedFixtureIdRef.current === fixture.id}
          matchCardRefs={matchCardRefs}
          predictionMode={predictionModeTyped}
          groupName={groupName}
          matchNumber={matchNumbersMap[fixture.id]}
          timelineFilled={item.timelineFilled}
          timelineConnectorFilled={item.timelineConnectorFilled}
          isFirstInTimeline={item.isFirstInTimeline}
          isLastInTimeline={item.isLastInTimeline}
          isNextToPredict={fixture.id === nextToPredictIdRef.current}
          isMaxPoints={maxPoints > 0 && (fixture.prediction?.points ?? 0) === maxPoints}
          onFieldFocus={handleFieldFocus}
          onFieldBlur={handleFieldBlur}
          onCardChange={handleCardChange}
          onAutoNext={handleAutoNext}
          onSelectOutcome={
            predictionMode === "MatchWinner"
              ? handleSelectOutcome
              : undefined
          }
          onScrollToCard={scrollToMatchCard}
          onPressCard={handlePressCard}
          scrollY={scrollY}
        />
      );
    },
    // Deps only contain values that change on data load / filter change — NOT on keystroke.
    // Hot state (focus, predictions, highlight) is read from refs; extraData triggers re-calls.
    [
      theme, inputRefs, matchCardRefs, predictionModeTyped, groupName,
      matchNumbersMap, maxPoints, handleFieldFocus, handleFieldBlur,
      handleCardChange, handleAutoNext, predictionMode, handleSelectOutcome,
      scrollToMatchCard, handlePressCard, scrollY, getPrediction, isPredictionSaved,
    ]
  );

  /** ListHeaderComponent — skeleton, empty state, or summary card. */
  const listHeaderComponent = useMemo(() => {
    if (!isReady) {
      return <GroupGamesSkeleton />;
    }
    if (emptyState && filteredFixtures.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <AppText
            variant="body"
            color="secondary"
            style={styles.emptyStateMessage}
          >
            {emptyState.message}
          </AppText>
          {emptyState.suggestion && (
            <AppText
              variant="body"
              style={[
                styles.emptyStateSuggestion,
                { color: theme.colors.primary },
              ]}
              onPress={emptyState.suggestion.action}
            >
              {emptyState.suggestion.label}
            </AppText>
          )}
        </View>
      );
    }
    return (
      <GamesSummaryCard
        totalPoints={summaryStats.totalPoints}
        predictedCount={savedPredictionsCount}
        totalCount={totalPredictionsCount}
        accuracy={summaryStats.accuracy}
        hasFilledTimeline={hasFilledCards}
      />
    );
  }, [
    isReady, emptyState, filteredFixtures.length, theme, summaryStats,
    savedPredictionsCount, totalPredictionsCount, hasFilledCards,
  ]);

  /** No fixtures at all (e.g. group has no games selected). */
  if (fixtures.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <AppText variant="body" color="secondary">
            {t("predictions.noGamesSelected")}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >

      {/* Timeline track — full screen height, hidden during skeleton */}
      {isReady && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: TIMELINE.TRACK_WIDTH,
            backgroundColor: theme.colors.primary + "18",
            zIndex: 1,
          }}
          pointerEvents="none"
        />
      )}

      <View style={{ flex: 1 }}>
        <Animated.FlatList
          ref={flatListRef}
          data={isReady ? renderItems : []}
          renderItem={flatListRenderItem}
          keyExtractor={flatListKeyExtractor}
          extraData={flatListExtraData}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: HEADER_HEIGHT + insets.top,
              paddingBottom: FOOTER_PADDING + keyboardHeight,
            },
          ]}
          ListHeaderComponent={listHeaderComponent}
          onScroll={animatedScrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          windowSize={7}
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          onScrollToIndexFailed={(info) => {
            // Fallback: scroll to approximate offset, then retry after layout
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewOffset: SCROLL_OFFSET,
              });
            }, 200);
          }}
        />

        <ScoreInputNavigationBar
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          keyboardHeight={keyboardHeight}
          onDone={handleDone}
          isSaving={isSaving}
          teamName={focusedTeamInfo?.name}
          teamLogo={focusedTeamInfo?.logo}
        />

        {/* Header floats above list content — collapses on scroll down */}
        <Animated.View
          style={[styles.headerOverlay, headerAnimatedStyle]}
          pointerEvents="box-none"
        >
          <GroupGamesHeader
            onBack={handleBack}
            backOnly
            title={groupName}
            expandAnim={hasAnyChips ? filterAnim : undefined}
            expandHeight={FILTER_PANEL_H}
            isExpanded={filtersOpen}
            onToggleExpand={setFiltersOpen}
            expandedContent={
              <View style={{ position: "absolute", left: 10, right: 10, top: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
                <SmartFilterChips
                  actionChips={actionChips}
                  selectedAction={selectedAction}
                  onSelectAction={selectAction}
                  structuralFilter={structuralFilter}
                  onSelectTeam={selectTeam}
                  onSelectCompetition={selectCompetition}
                  onSelectRound={selectRound}
                  onNavigateRound={navigateRound}
                />
              </View>
            }
          />
        </Animated.View>

        {/* Floating scroll-to-next button */}
        {scrollBtnDir === "up" && (
          <Animated.View
            style={[
              styles.scrollToNextBtn,
              { backgroundColor: theme.colors.primary, top: HEADER_HEIGHT + insets.top + 12 },
              scrollBtnAnimatedStyle,
            ]}
          >
            <Pressable onPress={handleScrollToNext} style={styles.scrollToNextBtnInner}>
              <View style={[styles.scrollToNextArrow, { borderTopColor: "#fff" }, { transform: [{ rotate: "180deg" }] }]} />
            </Pressable>
          </Animated.View>
        )}
        {scrollBtnDir === "down" && (
          <Pressable
            style={[
              styles.scrollToNextBtn,
              { backgroundColor: theme.colors.primary },
              { bottom: keyboardHeight > 0 ? keyboardHeight + 40 : insets.bottom + 8 },
            ]}
            onPress={handleScrollToNext}
          >
            <View style={[styles.scrollToNextArrow, { borderTopColor: "#fff" }]} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Layout: full-screen container, scroll content with padding, floating header overlay. */
const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: 0 },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  /* ── Section headers (same timeline column as cards) ── */
  sectionHeaderRow: {
    flexDirection: "row",
  },
  sectionTimelineCol: {
    width: TIMELINE.COLUMN_WIDTH,
    alignItems: "center",
    alignSelf: "stretch",
  },
  sectionHeaderContent: {
    flex: 1,
    paddingLeft: 10, // match contentColumn paddingLeft
    justifyContent: "center",
  },
  sectionDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    paddingRight: TIMELINE.COLUMN_WIDTH, // match card right spacer for centering
  },
  sectionDateLine: {
    flex: 1,
    height: 1.5,
  },
  sectionDateLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionLeaguePill: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 0,
    marginBottom: 15,
    marginRight: TIMELINE.COLUMN_WIDTH, // center relative to cards
  },
  sectionLeagueLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#EF444415",
  },
  sectionLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  sectionLiveText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#EF4444",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyStateMessage: {
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateSuggestion: {
    fontWeight: "600",
  },
  /* ── Floating scroll-to-next button ── */
  scrollToNextBtn: {
    position: "absolute",
    left: (TIMELINE.TRACK_WIDTH + TIMELINE.COLUMN_WIDTH + 4) / 2 - 15,
    zIndex: 20,
    width: 30,
    height: 30,
    borderRadius: 8,
    // backgroundColor set inline with theme.colors.primary
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    // 3D floating effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollToNextBtnInner: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollToNextArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    // borderTopColor set inline (#fff)
  },
});
