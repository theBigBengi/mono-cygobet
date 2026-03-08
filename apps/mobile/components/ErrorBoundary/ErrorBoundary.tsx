// components/ErrorBoundary/ErrorBoundary.tsx
// Feature-level error boundary wrapper with error reporting.

import React, { useCallback } from "react";
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from "react-error-boundary";
import { useQueryClient } from "@tanstack/react-query";
import { handleError } from "@/lib/errors";
import { FeatureErrorFallback } from "./FeatureErrorFallback";

interface Props {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ComponentType<FallbackProps>;
}

export function ErrorBoundary({ children, feature, fallback }: Props) {
  const queryClient = useQueryClient();

  const handleErrorCallback = useCallback(
    (error: Error, info: React.ErrorInfo) => {
      handleError(error, {
        source: "featureErrorBoundary",
        feature,
        componentStack: info.componentStack,
      });
    },
    [feature]
  );

  const handleReset = useCallback(() => {
    // Remove failed queries so the feature re-fetches fresh data
    queryClient.removeQueries({ predicate: (q) => q.state.status === "error" });
  }, [queryClient]);

  const FallbackComponent = fallback ?? FeatureErrorFallback;

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={handleErrorCallback}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}
