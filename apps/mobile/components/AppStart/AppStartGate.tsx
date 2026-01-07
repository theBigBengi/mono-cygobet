// components/AppStart/AppStartGate.tsx
// App start gate UI component.
// Shows loading or error state during app initialization.

import React, { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { appStartStatusAtom, appStartErrorAtom } from "@/lib/appStart/appStart.state";
import { runAppStart } from "@/lib/appStart/appStart.run";
import { prefetchInitialData } from "@/lib/appStart/appStart.prefetch";
import { useAuth } from "@/lib/auth/useAuth";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { Button } from "@/components/ui";
import { queryClient } from "@/lib/query/queryClient";

interface AppStartGateProps {
  children: React.ReactNode;
}

export function AppStartGate({ children }: AppStartGateProps) {
  const status = useAtomValue(appStartStatusAtom);
  const error = useAtomValue(appStartErrorAtom);
  const setStatus = useSetAtom(appStartStatusAtom);
  const setError = useSetAtom(appStartErrorAtom);
  const auth = useAuth();
  const bootstrapRanRef = useRef(false);

  // Debug: log status changes
  useEffect(() => {
    console.log("AppStartGate: status changed to", status, "error:", error);
  }, [status, error]);

  // Effect 1: Run bootstrap once on mount
  useEffect(() => {
    if (bootstrapRanRef.current) return;
    bootstrapRanRef.current = true;
    
    setStatus("booting");
    setError(null);
    runAppStart(auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Effect 2: Prefetch when auth state is ready (status is booting and auth.status is not loading)
  useEffect(() => {
    // Only prefetch if we're still in booting state
    if (status !== "booting") return;
    
    // Wait for auth status to stabilize (not loading)
    if (auth.status === "loading") {
      console.log("AppStartGate: auth.status is still loading, waiting...");
      return;
    }

    // Auth state has stabilized, now prefetch
    console.log("AppStartGate: auth state stabilized, starting prefetch");
    prefetchInitialData(queryClient, auth, setStatus, setError);
  }, [status, auth.status, auth.user, setStatus, setError]);

  const handleRetry = () => {
    bootstrapRanRef.current = false;
    setStatus("booting");
    setError(null);
    runAppStart(auth);
  };

  if (status === "booting") {
    return <QueryLoadingView message="Starting..." />;
  }

  if (status === "error" && error) {
    return (
      <QueryErrorView
        message={error.message}
        onRetry={handleRetry}
        extraActions={<Button label="Retry" onPress={handleRetry} />}
      />
    );
  }

  // status === "ready"
  return <>{children}</>;
}

