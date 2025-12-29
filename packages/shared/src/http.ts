export async function apiGet<T>(baseUrl: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}
