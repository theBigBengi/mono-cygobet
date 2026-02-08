// lib/errors/globalErrorHandlers.ts
// Global error handlers for unhandled errors
import { ErrorUtils } from "react-native";
import { handleError } from "./errorHandler";

let isInitialized = false;
let originalErrorHandler: ((error: Error, isFatal?: boolean) => void) | null = null;

/**
 * Initialize global error handlers
 * Should be called once at app startup
 */
export function initializeGlobalErrorHandlers() {
  if (isInitialized) {
    console.warn("[GlobalErrorHandlers] Already initialized, skipping");
    return;
  }

  isInitialized = true;

  // Handle unhandled promise rejections
  const rejectionHandler = (reason: unknown, promise: Promise<unknown>) => {
    console.error("[GlobalErrorHandlers] Unhandled promise rejection:", reason);
    handleError(reason, {
      source: "unhandledPromiseRejection",
      promise: promise.toString(),
    });
  };

  // Set up React Native error handler
  // ErrorUtils is part of React Native and should always be available
  if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === "function" && typeof ErrorUtils.setGlobalHandler === "function") {
    try {
      // Store original error handler
      originalErrorHandler = ErrorUtils.getGlobalHandler();

      // Set up React Native error handler
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error("[GlobalErrorHandlers] Global error:", error, "isFatal:", isFatal);

        // Handle the error
        handleError(error, {
          source: "reactNativeGlobalHandler",
          isFatal: isFatal ?? false,
          errorName: error.name,
        });

        // Call original handler if it exists (for React Native's default behavior)
        if (originalErrorHandler) {
          originalErrorHandler(error, isFatal);
        }
      });
    } catch (err) {
      console.warn("[GlobalErrorHandlers] Failed to set up React Native error handler:", err);
    }
  }

  // Handle unhandled promise rejections
  // Note: React Native doesn't have a built-in way to catch all unhandled rejections
  // We'll set up a handler that catches rejections in common async patterns
  if (typeof global !== "undefined") {
    // For development, we can add a warning
    if (__DEV__) {
      const originalConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        // Check if it's an unhandled promise rejection warning
        const message = args[0]?.toString() || "";
        if (message.includes("Unhandled promise rejection") || message.includes("Possible Unhandled Promise Rejection")) {
          const error = args[1] as Error | undefined;
          if (error) {
            rejectionHandler(error, Promise.resolve());
          }
        }
        originalConsoleError(...args);
      };
    }
  }

  if (__DEV__) console.log("[GlobalErrorHandlers] Initialized global error handlers");
}

/**
 * Cleanup global error handlers (useful for testing)
 */
export function cleanupGlobalErrorHandlers() {
  if (!isInitialized) {
    return;
  }

  if (originalErrorHandler && ErrorUtils?.setGlobalHandler) {
    ErrorUtils.setGlobalHandler(originalErrorHandler);
    originalErrorHandler = null;
  }

  isInitialized = false;
  if (__DEV__) console.log("[GlobalErrorHandlers] Cleaned up global error handlers");
}

/**
 * Manually handle an error (useful for try-catch blocks)
 */
export function handleGlobalError(error: unknown, context?: Record<string, unknown>) {
  return handleError(error, {
    ...context,
    source: "manual",
  });
}
