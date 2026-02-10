// lib/env.ts
/**
 * Environment configuration for API base URL
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "4000";

/**
 * Get the Expo dev-server host IP.
 * When running on a physical device, Expo sets `hostUri` to the machine's
 * LAN IP (e.g. "192.168.1.42:8081"). We strip the port and reuse the IP.
 */
function getDevServerHost(): string | null {
  // Constants.expoConfig?.hostUri is set when the JS bundle is served from
  // the Expo dev server (both Expo Go and dev-client builds).
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }
  return null;
}

export function getApiBaseUrl(): string {
  // 1. Explicit env var always wins (production + CI + manual override)
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (baseUrl) return baseUrl;

  // 2. Production must have the env var
  if (!__DEV__) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is required in production. Set it in your .env file."
    );
  }

  // 3. Development: Web can always use localhost
  if (Platform.OS === "web") {
    return `http://localhost:${API_PORT}`;
  }

  // 4. Development native: try to get the dev-server IP (works on both
  //    physical devices and simulators when Expo dev server is running)
  const devHost = getDevServerHost();
  if (devHost) {
    return `http://${devHost}:${API_PORT}`;
  }

  // 5. Simulator / emulator fallback (hostUri wasn't available)
  const isSimulatorOrEmulator = Constants.isDevice === false;
  if (isSimulatorOrEmulator) {
    if (Platform.OS === "android") {
      return `http://10.0.2.2:${API_PORT}`;
    }
    return `http://localhost:${API_PORT}`;
  }

  // 6. Physical device without dev-server IP - warn loudly
  console.warn(
    "⚠️  Running on a physical device but could not detect dev-server IP.\n" +
      "Set EXPO_PUBLIC_API_BASE_URL=http://<your-machine-ip>:" + API_PORT + "\n" +
      "Find your IP with: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
  );
  return `http://localhost:${API_PORT}`;
}

/**
 * Get the base URL for the OAuth browser flow (start / callback).
 *
 * Google only accepts `localhost` or real HTTPS domains as redirect URIs.
 * In the OAuth flow the browser must reach the server AND Google must
 * redirect back to it — so only localhost actually works locally
 * (iOS simulator, where browser localhost = host machine).
 *
 * Android emulator (10.0.2.2) and physical devices (LAN IP) both fail
 * because Google rejects those as redirect URIs. For those cases we
 * route through the production server (EXPO_PUBLIC_OAUTH_SERVER_URL).
 * Since dev and production share the same DB the OTC exchange still
 * works against the local dev server.
 *
 * Detection is automatic — no need to toggle env vars:
 *   - API URL is localhost → OAuth works locally (iOS simulator)
 *   - API URL is anything else + prod URL set → use production
 */
export function getOAuthBaseUrl(): string {
  if (!__DEV__) return getApiBaseUrl();

  const apiUrl = getApiBaseUrl();
  const isLocalhost =
    apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");

  if (isLocalhost) {
    return apiUrl;
  }

  // Non-localhost (Android emulator / physical device) — use production
  const prodUrl = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL;
  return prodUrl || apiUrl;
}
