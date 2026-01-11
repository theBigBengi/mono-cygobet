// lib/appStart/appStart.run.ts
// App start orchestrator: bootstrap only.
// Prefetch is handled separately in appStart.prefetch.ts after React state updates.

import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import { bootstrapPicks } from "@/features/picks";

/**
 * Run app start: bootstrap auth and picks.
 * Prefetch is handled separately after React state has updated.
 */
export async function runAppStart(auth: AuthContextValue): Promise<void> {
  console.log("AppStart: bootstrap start");

  // Bootstrap auth and picks in parallel (they're independent)
  await Promise.all([auth.bootstrap(), bootstrapPicks()]);

  console.log("AppStart: bootstrap end");
}
