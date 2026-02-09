// lib/analytics/analytics.ts
// Lightweight analytics service for the mobile app.
// - Batches events in memory, flushes periodically or on app background.
// - Tracks screen views with time-on-screen measurement.
// - Sends events to our own server (POST /api/analytics/events).

import { Platform, AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "../env";

// ---------- Types ----------

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, unknown>;
  screenName?: string;
  durationMs?: number;
  timestamp: string;
  sessionId: string;
  platform: string;
  appVersion: string;
}

// ---------- State ----------

let queue: AnalyticsEvent[] = [];
let userId: number | null = null;
let accessToken: string | null = null;
let sessionId: string = generateSessionId();
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentScreen: { name: string; enteredAt: number } | null = null;

const FLUSH_INTERVAL_MS = 30_000; // 30 seconds
const MAX_QUEUE_SIZE = 50;

const appVersion =
  Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "unknown";
const platform = Platform.OS; // "ios" | "android" | "web"

// ---------- Helpers ----------

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function enqueue(event: AnalyticsEvent) {
  queue.push(event);
  if (queue.length >= MAX_QUEUE_SIZE) {
    flush();
  }
}

async function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0);

  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    await fetch(`${baseUrl}/api/analytics/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // On failure, put events back (best-effort, drop if queue is too large)
    if (queue.length < 200) {
      queue.unshift(...batch);
    }
  }
}

// ---------- App State Listener ----------

function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === "background" || nextState === "inactive") {
    // End current screen tracking
    if (currentScreen) {
      const duration = Date.now() - currentScreen.enteredAt;
      enqueue({
        eventName: "screen_view_end",
        screenName: currentScreen.name,
        durationMs: duration,
        timestamp: new Date().toISOString(),
        sessionId,
        platform,
        appVersion,
      });
      currentScreen = null;
    }
    flush();
  } else if (nextState === "active") {
    // New session on return from background
    sessionId = generateSessionId();
  }
}

// ---------- Public API ----------

export const analytics = {
  /**
   * Initialize analytics. Call once on app start.
   */
  init() {
    if (flushTimer) return; // already initialized
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    AppState.addEventListener("change", handleAppStateChange);
  },

  /**
   * Identify the current user (call after login).
   */
  identify(id: number, token: string | null) {
    userId = id;
    accessToken = token;
  },

  /**
   * Update the access token (e.g. after refresh).
   */
  setToken(token: string | null) {
    accessToken = token;
  },

  /**
   * Clear user identity (call on logout).
   */
  reset() {
    userId = null;
    accessToken = null;
    sessionId = generateSessionId();
  },

  /**
   * Track a custom event.
   */
  track(eventName: string, properties?: Record<string, unknown>) {
    enqueue({
      eventName,
      properties,
      timestamp: new Date().toISOString(),
      sessionId,
      platform,
      appVersion,
    });
  },

  /**
   * Track a screen view. Also ends the previous screen and records duration.
   */
  screen(screenName: string, properties?: Record<string, unknown>) {
    const now = Date.now();

    // End previous screen
    if (currentScreen) {
      const duration = now - currentScreen.enteredAt;
      enqueue({
        eventName: "screen_view_end",
        screenName: currentScreen.name,
        durationMs: duration,
        timestamp: new Date().toISOString(),
        sessionId,
        platform,
        appVersion,
      });
    }

    // Start new screen
    currentScreen = { name: screenName, enteredAt: now };
    enqueue({
      eventName: "screen_view",
      screenName,
      properties,
      timestamp: new Date().toISOString(),
      sessionId,
      platform,
      appVersion,
    });
  },

  /**
   * Force flush all queued events immediately.
   */
  flush,
};
