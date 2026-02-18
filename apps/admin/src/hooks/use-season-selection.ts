import { useState, useCallback, useMemo } from "react";

export function useSeasonSelection() {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((id: number) => {
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

  const selectAll = useCallback((ids: number[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const deselectAll = useCallback((ids?: number[]) => {
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
    (id: number) => selected.has(id),
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
