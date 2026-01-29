// Thin connectivity wrapper. Uses @react-native-community/netinfo when available,
// falls back to navigator.onLine for web. Exposes only isOnlineSync() and subscribe(cb).

type ConnectivityCallback = (online: boolean) => void;

import { Platform } from "react-native";
import Constants from "expo-constants";

let netInfoModule: any = null;
let currentOnlineState: boolean | null = null;
let netInfoUnsupported = false;

// Initialize NetInfo on native platforms. We require dynamically so web builds
// that don't include the native dependency won't fail at bundle time.
function initNetInfo() {
  if (netInfoModule !== null) return;
  // If running in Expo Go (managed client) the native NetInfo interface is often
  // unavailable. Detect Expo Go and avoid requiring the native module entirely.
  try {
    const isExpoGo =
      Boolean(Constants?.appOwnership === "expo") ||
      Boolean(Constants?.executionEnvironment === "storeClient");
    if (isExpoGo) {
      console.info("NetInfo disabled: running in Expo Go (no native NetInfo).");
      netInfoUnsupported = true;
      return;
    }
  } catch (err) {
    // If Constants is not available for some reason, continue to platform check.
  }

  // Only attempt to require NetInfo on native platforms (ios/android).
  // Avoid requiring on web or server environments where the native module is absent.
  if (!(Platform && (Platform.OS === "ios" || Platform.OS === "android"))) {
    return;
  }

  try {
    // Require dynamically to avoid bundling issues on web.
    // Support both commonjs and ESM default export shapes.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-community/netinfo");
    const NetInfo = mod && (mod.default ?? mod);
    if (!NetInfo) {
      console.error("NetInfo module loaded but missing default export.");
      return;
    }

    netInfoModule = NetInfo;

    // Subscribe immediately so we get the current state synchronously-ish.
    // NetInfo's addEventListener typically invokes the listener with current
    // state on subscription; this lets us populate currentOnlineState before
    // other code queries isOnlineSync().
    // Validate native support: attempt to subscribe and immediately unsubscribe.
    // If the native interface is missing this will typically throw synchronously.
    try {
      const sub = netInfoModule.addEventListener((state: any) => {
        const online = !!(state.isConnected ?? state.isInternetReachable ?? true);
        currentOnlineState = online;
      });
      // If an unsubscribe function is returned, call it immediately to avoid leaks.
      try {
        if (typeof sub === "function") sub();
        else if (sub && typeof sub.remove === "function") sub.remove();
      } catch (err) {
        // Non-fatal - just log
        console.error("NetInfo: failed to clean up initial subscription:", err);
      }
    } catch (err) {
      // Native interface is unavailable (common in Expo Go). Mark unsupported so we
      // don't attempt partial integration and so callers can fall back explicitly.
      console.error(
        "NetInfo native interface appears to be missing or broken. Falling back to web fallback. Error:",
        err
      );
      netInfoModule = null;
      netInfoUnsupported = true;
      return;
    }

    // Also attempt a one-off fetch to seed currentOnlineState in case the
    // addEventListener above is not synchronous in this environment.
    if (typeof netInfoModule.fetch === "function") {
      netInfoModule
        .fetch()
        .then((state: any) => {
          currentOnlineState = !!(state.isConnected ?? state.isInternetReachable ?? true);
        })
        .catch((err: any) => {
          // If fetch fails asynchronously it's indicative of missing native parts.
          console.error("NetInfo.fetch failed:", err);
          netInfoModule = null;
          netInfoUnsupported = true;
        });
    }
  } catch (err) {
    // Surface the error loudly so it's visible during development/test runs.
    console.error("Failed to require @react-native-community/netinfo:", err);
    netInfoModule = null;
  }
}


export function isOnlineSync(): boolean {
  // Ensure NetInfo is initialized on native platforms.
  try {
    initNetInfo();
  } catch (err) {
    console.error("initNetInfo failed in isOnlineSync:", err);
  }

  // If we have a seeded synchronous state from NetInfo, prefer it.
  if (currentOnlineState !== null) {
    return currentOnlineState;
  }

  // Web fallback
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    // @ts-ignore
    return Boolean(navigator.onLine);
  }

  // Unknown environment - assume online as last resort.
  return true;
}

export function subscribe(cb: ConnectivityCallback) {
  // Ensure NetInfo is initialized on native platforms.
  try {
    initNetInfo();
  } catch (err) {
    console.error("initNetInfo failed in subscribe:", err);
  }

  // If NetInfo was detected to be unsupported (e.g., Expo Go), do not attempt
  // to register native listeners — return a no-op unsubscribe so callers keep
  // working without native events.
  if (netInfoUnsupported) {
    return () => {};
  }

  if (netInfoModule && typeof netInfoModule.addEventListener === "function") {
    const unsubscribe = netInfoModule.addEventListener((state: any) => {
      const online = !!(state.isConnected ?? state.isInternetReachable ?? true);
      // Keep internal seed in sync
      currentOnlineState = online;
      cb(online);
    });
    return () => {
      try {
        unsubscribe();
      } catch (err) {
        console.error("Failed to unsubscribe NetInfo listener:", err);
      }
    };
  }

  // Fallback to window events for web
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    const onOnline = () => cb(true);
    const onOffline = () => cb(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }

  // No-op unsubscribe
  return () => {};
}

export default {
  isOnlineSync,
  subscribe,
};

