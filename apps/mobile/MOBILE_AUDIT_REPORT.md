# Mobile App Audit Report

**Date:** 2026-03-08
**App:** Cygobet Mobile (Expo / React Native)
**Scope:** Performance, Security, User Experience

---

## Performance - Critical Issues

### 1. `useFrameCallback` running `measure()` every frame in GroupCard [CRITICAL]

**File:** `features/groups/group-list/components/GroupCard.tsx:385-389`

```tsx
useFrameCallback(() => {
  const measurement = measure(animatedRef);
  if (measurement) {
    isInRange.value = measurement.pageY >= PULSE_START && measurement.pageY <= PULSE_END ? 1 : 0;
  }
});
```

`useFrameCallback` fires at ~60fps. It calls `measure()` on every frame for every `NextGameRow` rendered. With 10+ groups visible, this is **600+ measure calls/second**. This is the single biggest performance problem in the app.

**Fix:** Replace with an `onScroll` handler using `scrollEventThrottle` and manual visibility calculation.

---

### 2. Debug UI and 7 Modal imports in production [CRITICAL]

**File:** `features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx:37-42, 89-96, 443-557`

Seven debug screens imported unconditionally at the top level (DebugCTAScreen, DebugLeaderboardScreen, DebugPredictionsOverviewScreen, DebugSingleGameScreen, DebugGroupCardScreen, DebugSwipeCardScreen, DebugGamesScreen). Seven `useState` hooks, seven `<Modal>` components, and seven `<Pressable>` debug buttons are **always rendered in production**. Not behind `__DEV__` guards.

**Fix:** Gate all debug imports and UI behind `if (__DEV__)`.

---

### 3. SocketProvider context value recreated every render [CRITICAL]

**File:** `lib/socket/SocketProvider.tsx:106-109`

```tsx
const value: SocketContextValue = {
  socket: socketRef.current,
  isConnected,
};
```

A new object reference is created every render, causing all socket context consumers to re-render.

**Fix:** Wrap in `useMemo` keyed on `[socketRef.current, isConnected]`.

---

### 4. `useGroupChat` messages array recreated every render [HIGH]

**File:** `domains/groups/groups-chat.hooks.ts:121-122`

```tsx
const messages: ChatMessage[] =
  messagesQuery.data?.pages.flatMap((p) => p.data) ?? [];
```

`.flatMap()` creates a new array reference every render, causing the chat FlatList to fully re-render.

**Fix:** Wrap in `useMemo` keyed on `messagesQuery.data`.

---

### 5. TeamLogo uses RN `Image` instead of `expo-image` [HIGH]

**File:** `components/ui/TeamLogo.tsx:7, 56-67`

React Native's `Image` has no disk caching on Android. `TeamLogo` is used hundreds of times across prediction cards, chat bubbles, and group cards. `expo-image` is already in `package.json`.

**Fix:** Switch to `expo-image`'s `Image` with `cachePolicy="memory-disk"`.

---

### 6. Inline arrow functions bypass React.memo on FlatList rows [HIGH]

**Files:**
- `features/groups/members/screens/GroupMembersScreen.tsx:141-148`
- `features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx:608-630`
- `features/groups/chat/screens/GroupChatScreen.tsx:364`

`MemberRow` is wrapped in `React.memo` but the inline `renderItem` creates a new function reference every render, making memo useless.

**Fix:** Wrap FlatList `renderItem` in `useCallback`.

---

### 7. GroupLobby fetches full chat history just to show 8 messages [MEDIUM]

**File:** `features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx:112, 609`

`useGroupChat` triggers a full infinite query (30 messages), then filters and slices to 8 on every render without `useMemo`.

**Fix:** Create a lightweight chat preview hook, or memoize the filtered result.

---

### 8. Missing FlatList virtualization tuning [MEDIUM]

**Files:**
- `features/groups/activity/screens/GroupActivityScreen.tsx:83-109`
- `features/groups/chat/screens/GroupChatScreen.tsx:306`
- `features/groups/members/screens/GroupMembersScreen.tsx:134`

Missing `windowSize`, `maxToRenderPerBatch`, `initialNumToRender`, `getItemLayout` props. Default `windowSize=21` renders far more offscreen items than needed.

---

### 9. Multiple independent `useCountdown` timers [MEDIUM]

**File:** `features/groups/predictions/hooks/useCountdown.ts:82-86`

Each GroupCard with a NextGameRow creates its own interval. With 10 visible cards = 10 independent timers each calling `setState` every 60 seconds, causing cascading re-renders.

**Fix:** Share a single timer via context/atom that broadcasts updates.

---

## Security - Critical Issues

### 1. No HTTPS enforcement in production [CRITICAL]

**File:** `lib/env.ts:26-67`

`getApiBaseUrl()` relies entirely on `EXPO_PUBLIC_API_BASE_URL` with **no validation** that the URL uses HTTPS. A misconfiguration sends all traffic (passwords, tokens) in cleartext.

**Fix:**
```typescript
if (!__DEV__ && !baseUrl.startsWith("https://")) {
  throw new Error("Production API URL must use HTTPS");
}
```

---

### 2. Access token exposed in React Context to all consumers [CRITICAL]

**File:** `lib/auth/AuthProvider.tsx:47, 729`

The raw access token is stored in `useState` and exposed to every component that calls `useAuth()`. Any third-party library or compromised component could exfiltrate it.

**Fix:** Remove `accessToken` from the public context value. The HTTP client handles injection via callback.

---

### 3. Access token stored in unprotected module-level variable in analytics [CRITICAL]

**File:** `lib/analytics/analytics.ts:29, 65-66`

Analytics stores the access token in a plain `let` variable and sends it via raw `fetch()` calls that bypass the auth retry/refresh logic.

**Fix:** Use `apiFetchWithAuthRetry` instead of raw `fetch`, or use the callback mechanism.

---

### 4. No certificate pinning [HIGH]

**Files:** `lib/http/apiClient.ts:111`, `lib/socket/SocketProvider.tsx:56`

Standard `fetch()` and `socket.io-client` without certificate pinning. On compromised networks, a MITM attacker with a trusted CA cert could intercept all traffic.

**Fix:** Implement certificate pinning using a native module for the production API domain.

---

### 5. Push notification deep link parameter not validated [HIGH]

**File:** `lib/push/usePushNotifications.ts:21-27`

```typescript
router.push(`/groups/${data.groupId}/chat`);
```

`data.groupId` from push payload is not validated. A malicious payload with `groupId: "../../sign-in"` could cause path traversal.

**Fix:** Validate `data.groupId` is a positive integer before navigating.

---

### 6. Sensitive errors logged unconditionally in production [MEDIUM]

**Files:** `lib/auth/auth.storage.ts:42,65,93`, `lib/push/pushNotifications.ts:62,89`

`console.error` / `console.warn` calls not gated behind `__DEV__`. May include token fragments or auth details accessible through device logs.

**Fix:** Wrap in `if (__DEV__)`.

---

### Positive Security Findings
- Refresh tokens use `expo-secure-store` (no insecure fallback)
- Web platform correctly uses HttpOnly cookies
- Single-flight refresh prevents concurrent token calls
- Zero usage of `eval()`, `new Function()`, or WebView
- No hardcoded secrets in source code
- No email enumeration (forgot-password always returns success)

---

## UX - Critical Issues

### 1. No offline indicator for network loss [CRITICAL]

**Files:** `components/DegradedBanner.tsx`, `lib/connectivity/netinfo.ts`

`DegradedBanner` only shows for auth degradation, NOT actual network loss. The connectivity module exists but no UI subscribes to it. Users get silent failures when offline.

**Fix:** Add a global offline banner that subscribes to `netinfo` status.

---

### 2. Root ErrorBoundary hardcoded to light theme [CRITICAL]

**File:** `app/_layout.tsx:363-412`

The root `ErrorBoundary` uses hardcoded `backgroundColor: "#ffffff"` and `color: "#000000"`. In dark mode, this flashes a bright white screen.

**Fix:** Use `Appearance.getColorScheme()` to pick appropriate colors.

---

### 3. Group lobby error silently redirects [HIGH]

**File:** `app/groups/[id]/index.tsx:125-131`

When group loading fails, the user is silently navigated back to the groups list. No error message, no toast, no retry option.

**Fix:** Show an error screen with a retry button before redirecting.

---

### 4. 80%+ interactive elements lack accessibility labels [HIGH]

Only 17 accessibility annotations exist across all feature files, while there are 100+ interactive elements. The worst offenders:
- Chat messages and expand button (`GroupChatScreen.tsx`)
- Prediction cards, filter chips, score inputs (`GroupGamesScreen.tsx`)
- Floating chat bar, quick actions, leaderboard rows (`GroupLobbyActiveScreen.tsx`)
- All invite components

**Fix:** Systematic accessibility pass across all features.

---

### 5. 60+ hardcoded LTR margins break Hebrew RTL [HIGH]

**30 files affected.** Worst offenders:
- `LobbyPredictionsCTA.tsx` (7 occurrences)
- `GroupCard.tsx` (5 occurrences)
- `createGroupFlow.styles.ts` (5 occurrences)
- `VerticalTimelineWrapper.tsx` (4 occurrences)
- `InviteCard.tsx` (4 occurrences)

All use `marginLeft`/`marginRight` instead of `marginStart`/`marginEnd`.

**Fix:** Replace all directional margin/padding with logical properties.

---

### 6. Alert.alert for form validation instead of inline errors [MEDIUM]

**Files:** `app/sign-in.tsx:49-51`, `app/username.tsx:42-58`, `app/change-password.tsx:41-52`

All validation uses native modal dialogs instead of inline error messages. Jarring, not accessible, blocks interaction.

**Fix:** Show inline error text below each field.

---

### 7. Language picker hidden -- no way to switch to Hebrew [MEDIUM]

**File:** `app/(tabs)/settings.tsx:230-254`

The language picker is entirely commented out. Despite full Hebrew translation support, users cannot switch languages.

---

### 8. No skeleton screens for chat, ranking, profile [MEDIUM]

Most screens show a bare `ActivityIndicator` centered on a blank screen. Only the Groups list has a proper skeleton.

---

### 9. No input focus chaining on auth forms [LOW]

**Files:** `sign-in.tsx`, `sign-up.tsx`, `username.tsx`, `change-password.tsx`

None use `returnKeyType="next"` with `onSubmitEditing` to chain focus between fields.

---

### 10. Sign-up link commented out on sign-in screen [LOW]

**File:** `app/sign-in.tsx:168-185`

"Don't have an account? Sign Up" is commented out. New users cannot discover sign-up from the sign-in screen.

---

## Summary: Top 10 Fixes by Impact

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | **Perf** | `useFrameCallback` calling `measure()` 600x/sec on group list | CRITICAL |
| 2 | **Security** | No HTTPS enforcement in production API URL | CRITICAL |
| 3 | **Security** | Access token exposed in public auth context | CRITICAL |
| 4 | **Perf** | Debug UI + 7 Modals always rendered in production | CRITICAL |
| 5 | **UX** | No offline indicator for network loss | CRITICAL |
| 6 | **Perf** | SocketProvider context value causes global re-renders | CRITICAL |
| 7 | **UX** | 80%+ interactive elements lack accessibility | HIGH |
| 8 | **UX** | 60+ hardcoded LTR margins break Hebrew RTL | HIGH |
| 9 | **Security** | No certificate pinning for API/socket | HIGH |
| 10 | **Perf** | TeamLogo uses RN Image without disk caching | HIGH |
