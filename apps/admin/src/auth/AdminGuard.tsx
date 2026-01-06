import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth();
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return (
      <div className="h-svh grid place-items-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}


