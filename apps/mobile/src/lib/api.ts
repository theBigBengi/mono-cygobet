export const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiError = Error & { status?: number };

console.log("API_BASE_URL =", process.env.EXPO_PUBLIC_API_BASE_URL);

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const url = new URL(path, BASE_URL);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const err: ApiError = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return (await res.json()) as T;
}
