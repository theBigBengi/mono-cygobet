import { adminFetch } from "@/lib/adminApi";

// Backwards-compatible wrappers used across the admin UI services.
// All calls are routed through `adminFetch` to ensure:
// - credentials: "include" (httpOnly cookie auth)
// - consistent JSON parsing
// - consistent error handling via AdminApiError

export async function apiGet<T>(path: string): Promise<T> {
  return adminFetch<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return adminFetch<T>(path, {
    method: "POST",
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return adminFetch<T>(path, {
    method: "PATCH",
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
  });
}
