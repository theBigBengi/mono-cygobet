// hooks/useDebounce.ts
// Debounce hook for delaying value updates.
// Useful for search inputs to prevent excessive API calls.

import { useState, useEffect } from "react";

/**
 * Debounce a value - delays updating the debounced value until after the specified delay.
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
