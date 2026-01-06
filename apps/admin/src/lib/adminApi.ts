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
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "";

  // ❌ אל תזרוק error בפרודקשן
  // same-origin הוא מצב חוקי לחלוטין

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
