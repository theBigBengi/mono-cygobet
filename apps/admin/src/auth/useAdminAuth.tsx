import * as React from "react";
import type { AdminMeResponse } from "@repo/types/http/admin";
import { AdminApiError } from "@/lib/adminApi";
import * as adminAuth from "./adminAuth";

export type AdminAuthStatus = "idle" | "loading" | "authed" | "guest";

export interface AdminAuthState {
  status: AdminAuthStatus;
  me: AdminMeResponse["data"] | null;
  error: string | null;
}

export interface AdminAuthActions {
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type AdminAuthContextValue = AdminAuthState & AdminAuthActions;

const AdminAuthContext = React.createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AdminAuthStatus>("idle");
  const [me, setMe] = React.useState<AdminMeResponse["data"] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const bootstrap = React.useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await adminAuth.me();
      setMe(res.data);
      setStatus("authed");
    } catch (err: unknown) {
      if (err instanceof AdminApiError && (err.status === 401 || err.status === 403)) {
        setMe(null);
        setStatus("guest");
        return;
      }

      setMe(null);
      setStatus("guest");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      setStatus("loading");
      setError(null);
      try {
        await adminAuth.login(email, password);
        await bootstrap();
      } catch (err: unknown) {
        setMe(null);
        setStatus("guest");
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      }
    },
    [bootstrap],
  );

  const logout = React.useCallback(async () => {
    setError(null);
    try {
      await adminAuth.logout();
    } finally {
      setMe(null);
      setStatus("guest");
    }
  }, []);

  const value = React.useMemo<AdminAuthContextValue>(
    () => ({ status, me, error, bootstrap, login, logout }),
    [status, me, error, bootstrap, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within <AdminAuthProvider />");
  }
  return ctx;
}


