export class AdminApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.body = body;
  }
}

function getAdminApiBaseUrl(): string {
  const baseUrl =
    (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined) ??
    // Backward compat with existing config in this app
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "";

  if (import.meta.env.PROD && !baseUrl) {
    throw new Error(
      "Missing VITE_ADMIN_API_BASE_URL (or VITE_API_URL) in production. Set VITE_ADMIN_API_BASE_URL to your admin API origin, e.g. http://localhost:4000"
    );
  }

  return baseUrl;
}

async function readBodyBestEffort(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toErrorMessage(body: unknown, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === "string") return body;
  if (typeof body === "object") {
    const maybeMessage = (body as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim())
      return maybeMessage;
  }
  return fallback;
}

// Detect mobile browsers that struggle with cross-origin cookies
function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/i.test(
    ua
  );
}

// Store session token for mobile browsers (fallback when cookies fail)
let mobileSessionToken: string | null = null;

export function setMobileSessionToken(token: string | null) {
  mobileSessionToken = token;
}

export async function adminFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  if (!path.startsWith("/admin/")) {
    throw new Error(`adminFetch path must start with "/admin/". Got: ${path}`);
  }

  const baseUrl = getAdminApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers = new Headers(init?.headers);
  const hasBody = typeof init?.body !== "undefined" && init?.body !== null;
  if (hasBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  // For mobile browsers, try Authorization header as fallback
  if (isMobileBrowser() && mobileSessionToken && !path.includes("/login")) {
    headers.set("Authorization", `Bearer ${mobileSessionToken}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  const body = await readBodyBestEffort(res);

  if (!res.ok) {
    const message = toErrorMessage(
      body,
      `Admin API error ${res.status}: ${res.statusText}`
    );
    throw new AdminApiError(message, res.status, body);
  }

  return body as T;
}
