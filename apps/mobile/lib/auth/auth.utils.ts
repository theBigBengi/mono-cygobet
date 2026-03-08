// Minimal JWT utilities used by AuthProvider.
// Only parses the `exp` claim from a JWT access token.

import { Buffer } from "buffer";

export function getTokenExpiry(accessToken: string | null): number | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Base64url decode via Buffer (works on Hermes, Node, and web)
    const json = Buffer.from(payload, "base64").toString("utf8");
    const obj = JSON.parse(json);
    if (!obj || typeof obj.exp !== "number") return null;
    // exp is in seconds since epoch
    return obj.exp * 1000;
  } catch {
    return null;
  }
}

