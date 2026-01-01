"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryState>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent hasError={this.state.hasError} error={this.state.error} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ hasError, error }: ErrorBoundaryState) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md w-full space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        {error && (
          <details className="mt-4 p-3 bg-muted rounded-md">
            <summary className="cursor-pointer text-sm font-medium mb-2">
              Error details
            </summary>
            <pre className="text-xs overflow-auto text-muted-foreground">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div className="flex gap-2">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
          >
            Refresh page
          </Button>
          <Button
            onClick={() => {
              window.location.href = "/";
            }}
            variant="outline"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}

