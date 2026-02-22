import { useState, useCallback, useMemo } from "react";
import type { ExternalId } from "@repo/types/sport-data/common";

export function useSeasonSelection() {
  const [selected, setSelected] = useState<Set<ExternalId>>(new Set());

  const toggle = useCallback((id: ExternalId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: ExternalId[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const deselectAll = useCallback((ids?: ExternalId[]) => {
    if (!ids) {
      setSelected(new Set());
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const isSelected = useCallback(
    (id: ExternalId) => selected.has(id),
    [selected]
  );

  const selectedIds = useMemo(() => [...selected], [selected]);

  return {
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount: selected.size,
    selectedIds,
  };
}
