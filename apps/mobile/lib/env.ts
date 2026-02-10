// lib/env.ts
/**
 * Environment configuration for API base URL
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Get the development server IP address
 * On real devices, we need the machine's IP, not localhost
 */
function getDevServerIP(): string {
  // Try to get the IP from Expo constants (works when connected to Expo dev server)
  const debuggerHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (debuggerHost) {
    return debuggerHost;
  }

  // Fallback: check if we're on a real device
  // For real devices, you MUST set EXPO_PUBLIC_API_BASE_URL to your machine's IP
  // Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:4000
  return "localhost";
}

export function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    if (__DEV__) {
      // In development
      if (Platform.OS === "web") {
        // Web: localhost works
        return "http://localhost:4000";
      }

      // For native platforms
      const host = getDevServerIP();

      // If we got a real IP (not localhost), use it
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return `http://${host}:4000`;
      }

      // For simulator/emulator, use appropriate localhost
      // Constants.isDevice is false on simulators/emulators
      const isSimulatorOrEmulator = Constants.isDevice === false;

      if (isSimulatorOrEmulator) {
        // Android emulator can't reach host via localhost - use 10.0.2.2
        if (Platform.OS === "android") {
          return "http://10.0.2.2:4000";
        }
        // iOS simulator can use localhost
        return "http://localhost:4000";
      }

      // Real device - need IP address
      console.warn(
        "⚠️  Running on a real device. Set EXPO_PUBLIC_API_BASE_URL to your machine's IP address.\n" +
          "Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:4000\n" +
          "Find your IP with: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
      );
      // Still return localhost as fallback, but it won't work on real devices
      return "http://localhost:4000";
    }
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is required in production. Set it in your .env file."
    );
  }

  return baseUrl;
}
