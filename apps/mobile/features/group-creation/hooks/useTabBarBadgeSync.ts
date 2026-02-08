// features/group-creation/hooks/useTabBarBadgeSync.ts
// Syncs group-creation selection state into the generic tab bar badge atom.
// Must be rendered inside a component that mounts when group-creation is active.

import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { tabBarBadgeAtom } from "@/lib/state/tabBarBadge.atom";
import { currentSelectionModeAtom } from "../selection/mode.atom";
import { createGroupModalVisibleAtom } from "../screens/create-group-modal.atom";
import { useHasSelectionForMode, useSelectionLabelForMode } from "./useSelectionState";

/**
 * Keeps the generic tab bar badge atom in sync with group-creation selection state.
 * Call this hook once in a component that stays mounted (e.g., CreateGroupScreen).
 */
export function useTabBarBadgeSync() {
  const currentMode = useAtomValue(currentSelectionModeAtom);
  const hasSelection = useHasSelectionForMode(currentMode);
  const selectionLabel = useSelectionLabelForMode(currentMode);
  const setBadge = useSetAtom(tabBarBadgeAtom);
  const setModalVisible = useSetAtom(createGroupModalVisibleAtom);

  const count = selectionLabel
    ? parseInt(selectionLabel.split(" ")[0], 10) || 0
    : 0;

  useEffect(() => {
    setBadge({
      visible: hasSelection,
      count,
      onActiveTap: () => setModalVisible(true),
    });

    return () => {
      setBadge({ visible: false, count: 0, onActiveTap: null });
    };
  }, [hasSelection, count, setBadge, setModalVisible]);
}
