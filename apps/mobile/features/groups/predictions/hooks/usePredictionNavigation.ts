import { useMemo, useRef, useState, useCallback } from "react";
import type { ScrollView, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
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

  const scrollViewRef = useRef<ScrollView>(null);

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

  const getCurrentFieldIndex = () => {
    if (!currentFocusedField) return -1;
    return allInputFields.findIndex(
      (field) =>
        field.fixtureId === currentFocusedField.fixtureId &&
        field.type === currentFocusedField.type
    );
  };

  const scrollToMatchCard = useCallback((fixtureId: number) => {
    const fixtureIdStr = String(fixtureId);
    const cardRef = matchCardRefs.current[fixtureIdStr];

    if (cardRef?.current && scrollViewRef.current) {
      cardRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - SCROLL_OFFSET),
            animated: true,
          });
        },
        () => {}
      );
    }
  }, []);

  const navigateToField = (index: number) => {
    if (index < 0 || index >= allInputFields.length) return;

    const field = allInputFields[index];
    const fixtureIdStr = String(field.fixtureId);
    const ref = inputRefs.current[fixtureIdStr]?.[field.type];

    if (ref?.current) {
      ref.current.focus();
      setCurrentFocusedField(field);
      // Don't scroll here - let the useEffect in GroupGamesScreen handle it
      // to avoid duplicate scroll calls
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentFieldIndex();
    if (currentIndex <= 0) return;

    const currentField = allInputFields[currentIndex];

    // If currently on "away", navigate to "home" in the same fixture
    if (currentField.type === "away") {
      const targetIndex = allInputFields.findIndex(
        (field) =>
          field.fixtureId === currentField.fixtureId && field.type === "home"
      );
      if (targetIndex >= 0) {
        navigateToField(targetIndex);
      }
      return;
    }

    // If currently on "home", navigate to "home" of the previous fixture
    // Find the previous fixture (different fixtureId before current index)
    let previousFixtureId: number | null = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (allInputFields[i].fixtureId !== currentField.fixtureId) {
        previousFixtureId = allInputFields[i].fixtureId;
        break;
      }
    }

    if (previousFixtureId === null) return;

    // In the previous fixture, focus the "home" field
    const targetIndex = allInputFields.findIndex(
      (field) =>
        field.fixtureId === previousFixtureId && field.type === "home"
    );

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

  const getNextFieldIndex = (
    currentFixtureId: number,
    currentType: "home" | "away"
  ) => {
    const currentIndex = allInputFields.findIndex(
      (field) =>
        field.fixtureId === currentFixtureId && field.type === currentType
    );
    return currentIndex >= 0 && currentIndex < allInputFields.length - 1
      ? currentIndex + 1
      : -1;
  };

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
    scrollViewRef,

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
