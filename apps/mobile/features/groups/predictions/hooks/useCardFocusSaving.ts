import React from "react";
import type { FocusedField } from "../types";

type UseCardFocusSavingArgs = {
  currentFocusedField: FocusedField;
  setCurrentFocusedField: (field: FocusedField) => void;
  /** When true, programmatic navigation is in progress — blur should not clear focus. */
  isNavigatingRef: React.MutableRefObject<boolean>;
};

type UseCardFocusSavingResult = {
  handleFieldFocus: (fixtureId: number, type: "home" | "away") => void;
  handleFieldBlur: (fixtureId: number) => void;
};

/**
 * Centralizes the logic for:
 * - tracking which fixture is currently focused (delegated from navigation hook)
 * - handling field focus and blur events (no longer triggers saves)
 *
 * Note: Saving is now handled when keyboard is dismissed, not on blur.
 */
export function useCardFocusSaving({
  currentFocusedField,
  setCurrentFocusedField,
  isNavigatingRef,
}: UseCardFocusSavingArgs): UseCardFocusSavingResult {
  // Ref-bridge: read currentFocusedField without adding it as a callback dep
  const currentFocusedFieldRef = React.useRef(currentFocusedField);
  currentFocusedFieldRef.current = currentFocusedField;

  const handleFieldFocus = React.useCallback(
    (fixtureId: number, type: "home" | "away") => {
      setCurrentFocusedField({ fixtureId, type });
    },
    [setCurrentFocusedField]
  );

  const handleFieldBlur = React.useCallback(
    (fixtureId: number) => {
      // During programmatic navigation the new focus state is already set;
      // ignore the blur from the old input so it doesn't flash to null.
      if (isNavigatingRef.current) return;
      if (currentFocusedFieldRef.current?.fixtureId === fixtureId) {
        setCurrentFocusedField(null);
      }
    },
    [setCurrentFocusedField, isNavigatingRef]
  );

  return {
    handleFieldFocus,
    handleFieldBlur,
  };
}

