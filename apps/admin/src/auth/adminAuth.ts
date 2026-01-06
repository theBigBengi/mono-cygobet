import type { AdminMeResponse } from "@repo/types/http/admin";
import { adminFetch } from "@/lib/adminApi";

export async function login(email: string, password: string): Promise<void> {
  await adminFetch<unknown>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await adminFetch<unknown>("/admin/auth/logout", { method: "POST" });
}

export async function me(): Promise<AdminMeResponse> {
  return adminFetch<AdminMeResponse>("/admin/auth/me", { method: "GET" });
}


