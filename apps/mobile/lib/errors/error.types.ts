// lib/errors/error.types.ts
// Error types and categories for system-level error handling

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  API = "api",
  NETWORK = "network",
  AUTH = "auth",
  VALIDATION = "validation",
  UNKNOWN = "unknown",
  COMPONENT = "component",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: unknown;
  context?: Record<string, unknown>;
  timestamp: number;
  stack?: string;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableLogging?: boolean;
  enableReporting?: boolean;
  onError?: (errorInfo: ErrorInfo) => void;
}
