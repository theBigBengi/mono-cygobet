// Minimal JWT utilities used by AuthProvider.
// Only parses the `exp` claim from a JWT access token.

export function getTokenExpiry(accessToken: string | null): number | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Base64url → standard base64, then decode via atob (available in Hermes)
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const obj = JSON.parse(json);
    if (!obj || typeof obj.exp !== "number") return null;
    // exp is in seconds since epoch
    return obj.exp * 1000;
  } catch {
    return null;
  }
}

