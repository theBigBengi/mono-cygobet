// lib/auth/auth.storage.ts
// Note: expo-secure-store must be installed: pnpm add expo-secure-store
import { Platform } from "react-native";

// SecureStore is only available on native platforms
let SecureStore: typeof import("expo-secure-store") | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SecureStore = require("expo-secure-store");
  } catch {
    console.error(
      "expo-secure-store not available. Tokens will not be persisted on this device."
    );
  }
}

const REFRESH_TOKEN_KEY = "user_refresh_token";

/**
 * Check if we're on web platform
 */
const isWeb = Platform.OS === "web";

/**
 * Get refresh token from secure storage.
 * Native: SecureStore. Web: HttpOnly cookie (not readable by JS) — returns null; refresh uses cookie.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      // Web: refresh token is in HttpOnly cookie; we never read it here
      return null;
    } else {
      // Native: use SecureStore only - no insecure fallback
      if (SecureStore) {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      }
      return null;
    }
  } catch (error) {
    console.error("Failed to get refresh token from secure storage:", error);
    return null;
  }
}

/**
 * Store refresh token in secure storage.
 * Native: SecureStore. Web: server sets HttpOnly cookie — no-op here.
 */
export async function setRefreshToken(token: string): Promise<void> {
  try {
    if (isWeb) {
      // Web: server sets HttpOnly cookie; do not store in localStorage (XSS-safe)
      return;
    } else {
      // Native: use SecureStore only - no insecure fallback
      if (SecureStore) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
        return;
      }
      throw new Error("SecureStore not available. Cannot store token securely.");
    }
  } catch (error) {
    console.error("Failed to store refresh token in secure storage:", error);
    // Provide more helpful error message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to store refresh token: ${errorMessage}. Platform: ${Platform.OS}`
    );
  }
}

/**
 * Clear refresh token from secure storage.
 * Native: SecureStore. Web: server clears cookie on logout — clear localStorage if any (migration).
 */
export async function clearRefreshToken(): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      return;
    } else {
      // Native: use SecureStore only
      if (SecureStore !== null) {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    }
  } catch (error) {
    console.error("Failed to clear refresh token from secure storage:", error);
    // Don't throw - best effort cleanup
  }
}
