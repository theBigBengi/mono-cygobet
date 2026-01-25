// lib/errors/errorHandler.ts
// Centralized error handling utility
import { ApiError } from "../http/apiError";
import { ErrorCategory, ErrorSeverity, ErrorInfo, ErrorHandlerConfig } from "./error.types";

let errorHandlerConfig: ErrorHandlerConfig = {
  enableLogging: true,
  enableReporting: false,
};

/**
 * Configure the error handler
 */
export function configureErrorHandler(config: Partial<ErrorHandlerConfig>) {
  errorHandlerConfig = { ...errorHandlerConfig, ...config };
}

/**
 * Categorize an error based on its type
 */
function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return ErrorCategory.NETWORK;
    }
    if (error.status === 401 || error.status === 403) {
      return ErrorCategory.AUTH;
    }
    if (error.status >= 400 && error.status < 500) {
      return ErrorCategory.VALIDATION;
    }
    return ErrorCategory.API;
  }

  if (error instanceof Error) {
    // React component errors
    if (error.name === "Error" || error.name === "TypeError" || error.name === "ReferenceError") {
      return ErrorCategory.COMPONENT;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine error severity
 */
function determineSeverity(error: unknown, category: ErrorCategory): ErrorSeverity {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return ErrorSeverity.HIGH;
    }
    if (error.status === 401 || error.status === 403) {
      return ErrorSeverity.MEDIUM;
    }
    if (error.status >= 400) {
      return ErrorSeverity.LOW;
    }
  }

  if (category === ErrorCategory.NETWORK) {
    return ErrorSeverity.MEDIUM;
  }

  if (category === ErrorCategory.COMPONENT) {
    return ErrorSeverity.HIGH;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * Extract error message
 */
function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || `API Error: ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
}

/**
 * Extract stack trace
 */
function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Create structured error info
 */
export function createErrorInfo(
  error: unknown,
  context?: Record<string, unknown>
): ErrorInfo {
  const category = categorizeError(error);
  const severity = determineSeverity(error, category);
  const message = extractMessage(error);
  const stack = extractStack(error);

  return {
    category,
    severity,
    message,
    originalError: error,
    context,
    timestamp: Date.now(),
    stack,
  };
}

/**
 * Log error to console
 */
function logError(errorInfo: ErrorInfo) {
  if (!errorHandlerConfig.enableLogging) {
    return;
  }

  const logLevel = errorInfo.severity === ErrorSeverity.CRITICAL || errorInfo.severity === ErrorSeverity.HIGH
    ? "error"
    : "warn";

  console[logLevel]("[ErrorHandler]", {
    category: errorInfo.category,
    severity: errorInfo.severity,
    message: errorInfo.message,
    context: errorInfo.context,
    timestamp: new Date(errorInfo.timestamp).toISOString(),
    stack: errorInfo.stack,
    originalError: errorInfo.originalError,
  });
}

/**
 * Report error to external service (ready for future integration)
 */
function reportError(errorInfo: ErrorInfo) {
  if (!errorHandlerConfig.enableReporting) {
    return;
  }

  // Future: Integrate with Sentry, Bugsnag, etc.
  // Example:
  // Sentry.captureException(errorInfo.originalError, {
  //   tags: {
  //     category: errorInfo.category,
  //     severity: errorInfo.severity,
  //   },
  //   extra: errorInfo.context,
  // });

  // For now, just call the custom callback if provided
  if (errorHandlerConfig.onError) {
    try {
      errorHandlerConfig.onError(errorInfo);
    } catch (err) {
      console.error("[ErrorHandler] Error in onError callback:", err);
    }
  }
}

/**
 * Handle an error - main entry point
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>
): ErrorInfo {
  const errorInfo = createErrorInfo(error, context);

  logError(errorInfo);
  reportError(errorInfo);

  return errorInfo;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const errorInfo = createErrorInfo(error);

  switch (errorInfo.category) {
    case ErrorCategory.NETWORK:
      return "Network connection error. Please check your internet connection and try again.";
    case ErrorCategory.AUTH:
      return "Authentication error. Please log in again.";
    case ErrorCategory.API:
      if (error instanceof ApiError && error.status >= 500) {
        return "Server error. Please try again later.";
      }
      return errorInfo.message;
    case ErrorCategory.VALIDATION:
      return errorInfo.message;
    case ErrorCategory.COMPONENT:
      return "Something went wrong. Please try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
