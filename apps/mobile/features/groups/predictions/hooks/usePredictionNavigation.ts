import { useMemo, useRef, useState, useCallback } from "react";
import type { FlatList, TextInput, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { canPredict } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { FocusedField } from "../types";
import { SCROLL_OFFSET } from "../utils/constants";

type Field = { fixtureId: number; type: "home" | "away" };

/** Generic group type - only requires fixtures array */
type FixtureGroup = { fixtures: FixtureItem[] };

/**
 * Handles:
 * - ordering of input fields (home → away, fixture by fixture)
 * - focus tracking (current field)
 * - next/previous navigation
 * - scrolling the list to keep the active fixture visible
 */
export function usePredictionNavigation(groups: FixtureGroup[]) {
  const [currentFocusedField, setCurrentFocusedField] =
    useState<FocusedField>(null);

  // Input refs by fixtureId
  const inputRefs = useRef<
    Record<
      string,
      {
        home: React.RefObject<TextInput | null>;
        away: React.RefObject<TextInput | null>;
      }
    >
  >({});

  // Card refs by fixtureId (for scroll-to)
  const matchCardRefs = useRef<Record<string, React.RefObject<View | null>>>(
    {}
  );

  const flatListRef = useRef<FlatList>(null);

  /** True while programmatic navigation is in progress (scroll + delayed focus).
   *  Prevents handleFieldBlur from clearing currentFocusedField mid-transition. */
  const isNavigatingRef = useRef(false);
  /** Same flag as SharedValue — readable from Reanimated UI-thread scroll handlers. */
  const isNavigatingSV = useSharedValue(0);

  /** Maps fixtureId → index in the FlatList data array. Updated by the screen. */
  const fixtureIndexMapRef = useRef<Map<number, number>>(new Map());

  const updateFixtureIndexMap = useCallback((map: Map<number, number>) => {
    fixtureIndexMapRef.current = map;
  }, []);

  const allInputFields: Field[] = useMemo(() => {
    const fields: Field[] = [];
    groups.forEach((group) => {
      group.fixtures.forEach((fixture) => {
        // Only include editable fixtures (not started)
        if (canPredict(fixture.state, fixture.startTs)) {
          fields.push({ fixtureId: fixture.id, type: "home" });
          fields.push({ fixtureId: fixture.id, type: "away" });
        }
      });
    });
    return fields;
  }, [groups]);

  /** O(1) lookup: "fixtureId-home" | "fixtureId-away" → index in allInputFields. */
  const fieldIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    allInputFields.forEach((f, i) => map.set(`${f.fixtureId}-${f.type}`, i));
    return map;
  }, [allInputFields]);

  const getFieldIndex = useCallback(
    (fixtureId: number, type: "home" | "away") =>
      fieldIndexMap.get(`${fixtureId}-${type}`) ?? -1,
    [fieldIndexMap]
  );

  const getCurrentFieldIndex = () => {
    if (!currentFocusedField) return -1;
    return getFieldIndex(currentFocusedField.fixtureId, currentFocusedField.type);
  };

  const scrollToMatchCard = useCallback((fixtureId: number) => {
    const index = fixtureIndexMapRef.current.get(fixtureId);
    if (index != null && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewOffset: SCROLL_OFFSET,
      });
    }
  }, []);

  const navigateToField = useCallback((index: number) => {
    if (index < 0 || index >= allInputFields.length) return;

    const field = allInputFields[index];
    const fixtureIdStr = String(field.fixtureId);

    // Update focus state immediately so the target card highlights instantly.
    // isNavigatingRef prevents handleFieldBlur from clearing it when the old
    // input fires blur during the .focus() call below.
    isNavigatingRef.current = true;
    isNavigatingSV.value = 1;
    setCurrentFocusedField(field);

    // Scroll so FlatList renders the cell, then focus after a short delay
    scrollToMatchCard(field.fixtureId);
    setTimeout(() => {
      const ref = inputRefs.current[fixtureIdStr]?.[field.type];
      if (ref?.current) {
        ref.current.focus();
      }
      isNavigatingRef.current = false;
      isNavigatingSV.value = 0;
    }, 150);
  }, [allInputFields, scrollToMatchCard]);

  const handlePrevious = () => {
    const currentIndex = getCurrentFieldIndex();
    if (currentIndex <= 0) return;

    const currentField = allInputFields[currentIndex];

    // If currently on "away", navigate to "home" in the same fixture
    if (currentField.type === "away") {
      const targetIndex = getFieldIndex(currentField.fixtureId, "home");
      if (targetIndex >= 0) {
        navigateToField(targetIndex);
      }
      return;
    }

    // If currently on "home", navigate to "home" of the previous fixture
    let previousFixtureId: number | null = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (allInputFields[i].fixtureId !== currentField.fixtureId) {
        previousFixtureId = allInputFields[i].fixtureId;
        break;
      }
    }

    if (previousFixtureId === null) return;

    const targetIndex = getFieldIndex(previousFixtureId, "home");
    if (targetIndex >= 0) {
      navigateToField(targetIndex);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentFieldIndex();
    if (currentIndex < allInputFields.length - 1) {
      navigateToField(currentIndex + 1);
    }
  };

  const getNextFieldIndex = useCallback(
    (currentFixtureId: number, currentType: "home" | "away") => {
      const currentIndex = getFieldIndex(currentFixtureId, currentType);
      return currentIndex >= 0 && currentIndex < allInputFields.length - 1
        ? currentIndex + 1
        : -1;
    },
    [getFieldIndex, allInputFields.length]
  );

  const canGoPrevious = getCurrentFieldIndex() > 0;
  const canGoNext =
    getCurrentFieldIndex() >= 0 &&
    getCurrentFieldIndex() < allInputFields.length - 1;

  return {
    // state
    currentFocusedField,
    setCurrentFocusedField,

    // refs
    inputRefs,
    matchCardRefs,
    flatListRef,
    isNavigatingRef,
    /** SharedValue mirror of isNavigatingRef — for Reanimated UI-thread code. */
    isNavigatingSV,

    // fixture index map (for FlatList scrollToIndex)
    updateFixtureIndexMap,

    // navigation
    handlePrevious,
    handleNext,
    canGoPrevious,
    canGoNext,
    getNextFieldIndex,
    navigateToField,
    scrollToMatchCard,
  };
}
