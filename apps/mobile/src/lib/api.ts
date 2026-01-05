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
  console.log("url.toString() =", url.toString());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  console.log("res =", res);

  if (!res.ok) {
    console.log("res error=", res);
    const err: ApiError = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  console.log("res =", res);

  const data = await res.json();
  console.log("data =", data);

  return data as T;
}
