// lib/appStart/appStart.state.ts
// Jotai atoms for app start state.

import { atom } from "jotai";
import type { AppStartStatus, AppStartError } from "./appStart.types";

/**
 * App start status atom
 * - "booting": Initial state, orchestrator is running
 * - "ready": Bootstrap and prefetch completed successfully
 * - "error": An error occurred during startup
 */
export const appStartStatusAtom = atom<AppStartStatus>("booting");

/**
 * App start error atom
 * - null when no error
 * - AppStartError when an error occurred
 */
export const appStartErrorAtom = atom<AppStartError | null>(null);

