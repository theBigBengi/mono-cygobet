// lib/appStart/appStart.run.ts
// App start orchestrator: bootstrap only.
// Prefetch is handled separately in appStart.prefetch.ts after React state updates.

import type { AuthContextValue } from "@/lib/auth/AuthProvider";

/**
 * Run app start: bootstrap auth only.
 * Prefetch is handled separately after React state has updated.
 */
export async function runAppStart(auth: AuthContextValue): Promise<void> {
  console.log("AppStart: bootstrap start");
  await auth.bootstrap();
  console.log("AppStart: bootstrap end");
}
