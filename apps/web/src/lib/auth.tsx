"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiClient } from "@/lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type User = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  image: string | null;
  role: string;
};

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username?: string;
    name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const clearAuth = useCallback(() => {
    apiClient.setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Wire up auth-lost callback so apiClient can trigger logout
  useEffect(() => {
    apiClient.setOnAuthLost(clearAuth);
  }, [clearAuth]);

  // Bootstrap: try to restore session from cookie
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const token = await apiClient.refresh();
        if (cancelled) return;
        if (!token) {
          setStatus("unauthenticated");
          return;
        }

        const me = await apiClient.fetch<User>("/auth/me");
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    const res = await apiClient.publicFetch<{
      user: User;
      accessToken: string;
    }>("/auth/login", {
      method: "POST",
      body: { emailOrUsername, password },
    });
    apiClient.setAccessToken(res.accessToken);
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      username?: string;
      name?: string;
    }) => {
      const res = await apiClient.publicFetch<{
        user: User;
        accessToken: string;
      }>("/auth/register", {
        method: "POST",
        body: data,
      });
      apiClient.setAccessToken(res.accessToken);
      setUser(res.user);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.fetch("/auth/logout", { method: "POST" });
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
