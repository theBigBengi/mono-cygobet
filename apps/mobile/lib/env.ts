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
 * Returns true when running on a physical device in development.
 */
function isPhysicalDeviceDev(): boolean {
  return __DEV__ && Platform.OS !== "web" && Constants.isDevice === true;
}

/**
 * Get the base URL for OAuth redirect flow (start / callback).
 *
 * On a physical device in dev, Google rejects private IPs as redirect URIs,
 * so we route the OAuth browser flow through the production server.
 * Since dev and production share the same DB, the OTC exchange still works
 * against the local dev server.
 *
 * Everywhere else (simulator, emulator, production) we use the normal API URL.
 */
export function getOAuthBaseUrl(): string {
  const prodUrl = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL;

  if (isPhysicalDeviceDev() && prodUrl) {
    return prodUrl;
  }

  return getApiBaseUrl();
}
