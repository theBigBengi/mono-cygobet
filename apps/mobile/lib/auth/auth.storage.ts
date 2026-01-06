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
    // SecureStore not available
    console.warn(
      "expo-secure-store not available, falling back to localStorage"
    );
  }
}

const REFRESH_TOKEN_KEY = "user_refresh_token";

/**
 * Check if we're on web platform
 */
const isWeb = Platform.OS === "web";

/**
 * Get refresh token from secure storage
 * Uses SecureStore on native, localStorage on web
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      // Web: use localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return null;
    } else {
      // Native: use SecureStore
      if (SecureStore) {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      }
      // Fallback to localStorage if SecureStore not available
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return null;
    }
  } catch (error) {
    console.error("Failed to get refresh token from secure storage:", error);
    return null;
  }
}

/**
 * Store refresh token in secure storage
 * Uses SecureStore on native, localStorage on web
 */
export async function setRefreshToken(token: string): Promise<void> {
  try {
    if (isWeb) {
      // Web: use localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
        return;
      }
      throw new Error("localStorage is not available");
    } else {
      // Native: use SecureStore
      if (SecureStore) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
        return;
      }
      // Fallback to localStorage if SecureStore not available
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
        return;
      }
      throw new Error("No storage mechanism available");
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
 * Clear refresh token from secure storage
 * Uses SecureStore on native, localStorage on web
 */
export async function clearRefreshToken(): Promise<void> {
  try {
    if (isWeb) {
      // Web: use localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        return;
      }
    } else {
      // Native: use SecureStore
      if (SecureStore !== null) {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return;
      }
      // Fallback to localStorage if SecureStore not available
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
  } catch (error) {
    console.error("Failed to clear refresh token from secure storage:", error);
    // Don't throw - best effort cleanup
  }
}
