import type { AdminMeResponse } from "@repo/types/http/admin";
import { adminFetch, setMobileSessionToken } from "@/lib/adminApi";

export async function login(email: string, password: string): Promise<void> {
  await adminFetch<unknown>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // For mobile browsers, try to extract session token from cookies as fallback
  try {
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('admin_session='));
    if (sessionCookie) {
      const token = sessionCookie.split('=')[1];
      setMobileSessionToken(token);
    }
  } catch (e) {
    // Ignore cookie access errors (some browsers restrict cookie access)
  }
}

export async function logout(): Promise<void> {
  setMobileSessionToken(null); // Clear mobile token
  await adminFetch<unknown>("/admin/auth/logout", { method: "POST" });
}

export async function me(): Promise<AdminMeResponse> {
  return adminFetch<AdminMeResponse>("/admin/auth/me", { method: "GET" });
}


