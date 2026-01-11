// lib/state/jotaiStore.ts
// Single Jotai store instance for the entire app.
// This ensures bootstrap, Provider, and components all use the same store.

import { createStore } from "jotai";

/**
 * Single Jotai store instance used throughout the app.
 * - Passed to JotaiProvider in root layout
 * - Used by bootstrap functions
 * - Used by action functions outside React components
 */
export const jotaiStore = createStore();
