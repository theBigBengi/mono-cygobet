// Minimal JWT utilities used by AuthProvider.
// Only parses the `exp` claim from a JWT access token.
export function getTokenExpiry(accessToken: string | null): number | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Base64 decode (URL-safe)
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(json);
    if (!obj || typeof obj.exp !== "number") return null;
    // exp is in seconds since epoch
    return obj.exp * 1000;
  } catch (err) {
    // If running in RN environment where atob may be missing, try fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Buffer = require("buffer").Buffer;
      const parts = accessToken.split(".");
      const payload = parts[1];
      const json = Buffer.from(payload, "base64").toString("utf8");
      const obj = JSON.parse(json);
      if (!obj || typeof obj.exp !== "number") return null;
      return obj.exp * 1000;
    } catch {
      return null;
    }
  }
}

