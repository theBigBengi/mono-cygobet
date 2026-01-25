import React from "react";
import type { FocusedField } from "../types";

type UseCardFocusSavingArgs = {
  currentFocusedField: FocusedField;
  setCurrentFocusedField: (field: FocusedField) => void;
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
}: UseCardFocusSavingArgs): UseCardFocusSavingResult {
  const handleFieldFocus = React.useCallback(
    (fixtureId: number, type: "home" | "away") => {
      setCurrentFocusedField({ fixtureId, type });
    },
    [setCurrentFocusedField]
  );

  const handleFieldBlur = React.useCallback(
    (fixtureId: number) => {
      if (currentFocusedField?.fixtureId === fixtureId) {
        setCurrentFocusedField(null);
      }
    },
    [currentFocusedField, setCurrentFocusedField]
  );

  return {
    handleFieldFocus,
    handleFieldBlur,
  };
}

