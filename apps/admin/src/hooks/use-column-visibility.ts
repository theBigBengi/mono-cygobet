import useLocalStorageState from "use-local-storage-state";
import type { VisibilityState } from "@tanstack/react-table";

/**
 * Hook to persist column visibility to local storage
 * @param storageKey - Unique key for this page/table (e.g., "fixtures-table", "odds-table")
 * @param defaultVisibility - Default visibility state
 * @returns [visibilityState, setVisibilityState]
 */
export function useColumnVisibility(
  storageKey: string,
  defaultVisibility: VisibilityState = {}
) {
  const [visibility, setVisibility] = useLocalStorageState<VisibilityState>(
    `column-visibility-${storageKey}`,
    {
      defaultValue: defaultVisibility,
    }
  );

  return [visibility, setVisibility] as const;
}

