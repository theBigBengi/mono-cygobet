// components/AppStart/AppStartGate.tsx
// App start gate UI component.
// Shows loading or error state during app initialization.

import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAtomValue, useSetAtom } from "jotai";
import {
  appStartStatusAtom,
  appStartErrorAtom,
} from "@/lib/appStart/appStart.state";
import { runAppStart } from "@/lib/appStart/appStart.run";
import { prefetchInitialData } from "@/lib/appStart/appStart.prefetch";
import { useAuth } from "@/lib/auth/useAuth";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { Button } from "@/components/ui";
import { queryClient } from "@/lib/query/queryClient";
import * as SplashScreen from "expo-splash-screen";

interface AppStartGateProps {
  children: React.ReactNode;
}

export function AppStartGate({ children }: AppStartGateProps) {
  const { t } = useTranslation("common");
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

  // Effect 2: Wait for auth to stabilize (restoring/idle -> final state), then load user if needed and prefetch
  useEffect(() => {
    // Only proceed if we're still in booting state
    if (status !== "booting") return;

    // Wait for auth status to stabilize: idle/restoring are in-flight states
    if (auth.status === "idle" || auth.status === "restoring") {
      console.log(
        "AppStartGate: auth.status is still restoring/idle, waiting..."
      );
      return;
    }

    // If authenticated but user missing - try loading user (defensive)
    if (auth.status === "authenticated" && !auth.user) {
      console.log(
        "AppStartGate: auth status is authenticated but user missing, loading user"
      );
      auth.loadUser();
      return; // Wait for user to load before prefetch
    }

    // Auth state has stabilized (restored to unauthenticated/authenticated/onboarding/degraded), now prefetch
    console.log("AppStartGate: auth state stabilized, starting prefetch");
    prefetchInitialData(queryClient, auth, setStatus, setError);
  }, [status, auth.status, auth.user, auth, setStatus, setError]);

  // Hide splash screen when app is ready (or error)
  useEffect(() => {
    if (status === "booting") return;
    SplashScreen.hideAsync();
  }, [status]);

  const handleRetry = () => {
    bootstrapRanRef.current = false;
    setStatus("booting");
    setError(null);
    runAppStart(auth);
  };

  if (status === "booting") {
    return <QueryLoadingView message={t("common.starting")} />;
  }

  if (status === "error" && error) {
    return (
      <QueryErrorView
        message={error.message}
        onRetry={handleRetry}
        extraActions={
          <Button label={t("common.retry")} onPress={handleRetry} />
        }
      />
    );
  }

  // status === "ready"
  return <>{children}</>;
}
