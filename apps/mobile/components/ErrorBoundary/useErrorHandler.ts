// components/ErrorBoundary/useErrorHandler.ts
// Hook to handle async errors and forward them to the nearest ErrorBoundary.

import { useErrorBoundary } from "react-error-boundary";

/**
 * Hook to handle async errors in components.
 * Use this to catch errors from async operations and throw them to ErrorBoundary.
 */
export function useErrorHandler() {
  const { showBoundary } = useErrorBoundary();

  return {
    handleError: (error: Error) => {
      showBoundary(error);
    },
  };
}
