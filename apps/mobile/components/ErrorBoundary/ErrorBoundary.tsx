// components/ErrorBoundary/ErrorBoundary.tsx
// Feature-level error boundary wrapper with Sentry integration.

import React, { useCallback } from "react";
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from "react-error-boundary";
import * as Sentry from "@sentry/react-native";
import { handleError } from "@/lib/errors";
import { FeatureErrorFallback } from "./FeatureErrorFallback";

interface Props {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ComponentType<FallbackProps>;
}

export function ErrorBoundary({ children, feature, fallback }: Props) {
  const handleErrorCallback = useCallback(
    (error: Error, info: React.ErrorInfo) => {
      handleError(error, {
        source: "featureErrorBoundary",
        feature,
        componentStack: info.componentStack,
      });

      Sentry.withScope((scope) => {
        scope.setTag("feature", feature);
        scope.setExtra("componentStack", info.componentStack);
        Sentry.captureException(error);
      });

      if (__DEV__) {
        // Use console.log instead of console.error to avoid red screen in dev
        console.log(`[${feature}] Error:`, error.message);
      }
    },
    [feature]
  );

  const FallbackComponent = fallback ?? FeatureErrorFallback;

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={handleErrorCallback}
      onReset={() => {
        // Reset any state that might have caused the error
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
