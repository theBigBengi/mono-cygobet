# Authentication System

Source of truth for all authentication behavior across the monorepo.
Covers user auth (mobile + web), admin auth (dashboard), token lifecycle, session management, and security hardening.

Last updated: January 2026.

---

## 1. Overview

The system maintains two independent authentication models:

**User Authentication** serves the mobile app (React Native / Expo) and its web variant. It uses short-lived JWT access tokens held in memory and long-lived refresh tokens persisted in secure device storage (native) or httpOnly cookies (web). The server stores only hashed refresh tokens in the `refreshSessions` table.

**Admin Authentication** serves the admin dashboard (React / Vite). It uses server-side sessions backed by the `sessions` table and delivered as httpOnly cookies. No JWTs are involved on the admin path.

The two models share no tokens, no tables, and no middleware. They are completely isolated.

### Client Matrix

| Client | Auth Model | Token Storage | Transport |
|---|---|---|---|
| Mobile Native (iOS/Android) | JWT + refresh token | Access: in-memory. Refresh: `expo-secure-store` | `Authorization: Bearer` header |
| Expo Web | JWT + refresh token | Access: in-memory. Refresh: httpOnly cookie | `Authorization: Bearer` header (access). Cookie (refresh) |
| Admin Dashboard | Session cookie | httpOnly cookie | Cookie with `credentials: "include"` |

---

## 2. Authentication Model

### Tokens and Where They Live

**Access Token (User)**
Short-lived JWT (server-configured TTL). Contains `sub` (user ID) and `role`. Does not contain username or any mutable user data. Held exclusively in React state (never persisted to disk). Lost on app kill; recovered via refresh.

**Refresh Token (User)**
Long-lived opaque token. On native platforms, stored in `expo-secure-store` (hardware-backed keychain on iOS, encrypted SharedPreferences on Android). On web, the server sets it as an httpOnly cookie so JavaScript never sees it. The server stores only a SHA-256 hash in `refreshSessions.tokenHash`. Rotated on every use.

**Admin Session Token**
Random 32-byte token generated server-side. The raw token is set as an httpOnly cookie (`admin_session`). The server stores only a SHA-256 hash in `sessions.sessionToken`. The session row includes an `expires` timestamp.

### Why This Model

- Access tokens in memory eliminate persistent storage as an XSS vector.
- Refresh tokens in SecureStore leverage OS-level encryption unavailable to other apps.
- Refresh tokens on web as httpOnly cookies prevent JavaScript access entirely.
- Hashing all long-lived tokens in the database limits the impact of a DB leak.
- Admin sessions use cookies instead of JWTs because admin actions are always online and sessions need server-side revocation without waiting for JWT expiry.

---

## 3. User Auth Flow (Mobile + Web)

### Auth State Machine

The client maintains a six-state machine:

| State | Meaning |
|---|---|
| `idle` | Initial state before any auth logic runs |
| `restoring` | Bootstrap in progress (checking stored refresh token) |
| `authenticated` | User is fully authenticated with a valid access token and loaded user data |
| `onboarding` | User is authenticated but has not completed onboarding (missing username) |
| `unauthenticated` | No valid session exists; show login |
| `degraded` | A refresh token exists but the server is unreachable; show limited/read-only UI |

Transitions are deterministic. Every code path in the provider must resolve to one of these six states. There is no ambiguous middle ground.

### Login

1. Client sends `POST /auth/login` with `{ emailOrUsername, password }`.
2. Server validates credentials, creates a `refreshSessions` row (hashed token), and returns `{ accessToken, refreshToken, user }`.
3. Client stores the refresh token (SecureStore on native, server sets cookie on web).
4. Client sets the access token in memory.
5. Client calls `GET /auth/me` to load full user data (role, onboarding flags).
6. State transitions to `authenticated` or `onboarding` based on `onboardingRequired`.

If `/auth/me` fails with a network error after login, the client transitions to `degraded` (refresh token exists but user data could not load).

### Register

1. Client sends `POST /auth/register` with `{ email, password }`.
2. Server creates the user, generates tokens, and returns the same shape as login.
3. Client calls `applyAuthResult` to apply tokens and user data in a single step. There is no second login call. This eliminates the double-roundtrip that existed in the original implementation.
4. Since newly registered users typically lack a username, state transitions to `onboarding`.

### Refresh

Refresh is triggered in three situations:
- **Reactive (401):** The HTTP client receives a 401, calls the refresh callback, retries the original request.
- **Proactive (timer):** A timer fires two minutes before the access token expires and silently refreshes.
- **Resume:** When the app returns to the foreground, it checks token expiry and refreshes if needed.

Refresh flow:
1. Client retrieves the refresh token (SecureStore on native, cookie on web).
2. Client sends `POST /auth/refresh` with the token in the request body (native) or relies on the cookie (web).
3. Server validates the hashed token against `refreshSessions`, checks `expiresAt` and `revokedAt`.
4. Server revokes the old session (sets `revokedAt`) and creates a new one atomically within a transaction.
5. Server returns new `{ accessToken, refreshToken }`.
6. Client persists the new refresh token and updates the in-memory access token.

Single-flight guarantee: a `refreshPromiseRef` ensures only one refresh request is in flight at any time. Concurrent callers share the same promise.

Error mapping on refresh failure:
- 401 from server: clear all tokens, transition to `unauthenticated`.
- Network error with refresh token present: transition to `degraded`.
- No refresh token available: transition to `unauthenticated`.

### Logout

1. Client sends `POST /auth/logout` with the refresh token (best-effort; network failure does not block logout).
2. Server revokes the refresh session (sets `revokedAt`).
3. Client clears the refresh token from SecureStore, clears the access token from memory, clears the user object.
4. Client removes all React Query cache entries tagged with `meta.scope === "user"`.
5. State transitions to `unauthenticated`.

### Bootstrap (App Start)

1. State set to `restoring`.
2. Check for a stored refresh token. If none exists, transition to `unauthenticated`.
3. Attempt refresh. If it fails with a 401, clear tokens and transition to `unauthenticated`. If it fails with a network error, retry once after a one-second delay. If the retry also fails, transition to `degraded` (keep the refresh token for later recovery).
4. On successful refresh, call `GET /auth/me`. If it succeeds, transition to `authenticated` or `onboarding`. If it fails with a 401, clear tokens and transition to `unauthenticated`. If it fails with a network error, transition to `degraded`.

### Degraded State and Recovery

When the client is in `degraded`, it holds onto the refresh token and subscribes to connectivity changes via `@react-native-community/netinfo` (native) or browser `online`/`offline` events (web).

When an offline-to-online transition is detected:
1. Attempt refresh.
2. If refresh succeeds, call `/auth/me` and transition to `authenticated` or `onboarding`.
3. If refresh fails with a 401, clear tokens and transition to `unauthenticated`.
4. If refresh fails with a network error, stay in `degraded`.

The DegradedBanner component renders a yellow banner with a manual Retry button for cases where automatic recovery does not trigger.

---

## 4. Admin Auth Flow

### Session Lifecycle

Admin authentication is cookie-only. No JWTs are involved.

**Login:**
1. Client sends `POST /admin/auth/login` with `{ email, password }`.
2. Server validates credentials and checks that the user has the `admin` role.
3. Server enforces concurrent session limits (max 3 active sessions). If the limit is reached, the oldest sessions are evicted atomically within a transaction.
4. Server creates a session row in the `sessions` table (hashed token, expiry timestamp).
5. Server sets the `admin_session` httpOnly cookie with the raw token.
6. Client calls `GET /admin/auth/me` to load admin user data.

**Global Route Protection:**
All routes under `/admin/*` require an authenticated admin session, enforced by a Fastify `onRequest` hook. The only exceptions are `/admin/auth/login` and `/admin/auth/logout`.

**Sliding Session Renewal:**
On every authenticated admin request, the middleware checks whether the session's remaining lifetime is at or below 25% of the configured TTL (default: 1 day). If so, it extends the session expiry in the database and updates the cookie. This happens transparently. If renewal fails, the request still succeeds (best-effort).

**Logout:**
1. Client sends `POST /admin/auth/logout`.
2. Server deletes the session row from the database.
3. Server clears the `admin_session` cookie.
4. Client resets state to `guest`.

**Session Expiry UX:**
When any admin API call returns 401, the `adminFetch` function dispatches a `CustomEvent("admin-session-expired")`. The `AdminAuthProvider` listens for this event and shows a `SessionExpiredModal` with the message "Your session has expired. Please log in again to continue." and a button that logs out and redirects to `/login`.

---

## 5. Session Management

### User Sessions (refreshSessions table)

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `userId` | Foreign key to users |
| `tokenHash` | SHA-256 hash of the raw refresh token |
| `expiresAt` | Absolute expiry timestamp |
| `revokedAt` | Soft-revocation timestamp (null if active) |
| `createdAt` | Creation timestamp |

A session is considered invalid if `revokedAt` is set or if `expiresAt` has passed. The `resolve` function checks both conditions.

**Revoke (single):** Sets `revokedAt` on the session matching the provided token hash. Used during logout and token rotation.

**Revoke-all:** Sets `revokedAt` on all active sessions for a given user ID. Exposed as `POST /auth/sessions/revoke-all`. Intended for "log out from all devices" scenarios.

**Token rotation:** Every successful refresh revokes the old session and creates a new one within a single Prisma transaction. This ensures atomicity: if the new session creation fails, the old session remains valid.

### Admin Sessions (sessions table)

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `userId` | Foreign key to users |
| `sessionToken` | SHA-256 hash of the raw session token |
| `expires` | Absolute expiry timestamp |

Admin sessions use hard deletion (not soft revocation). When a session is logged out, revoked, or expired, the row is deleted from the table.

**Revoke-all:** Deletes all session rows for a given admin user ID. Exposed as `POST /admin/auth/sessions/revoke-all`. Also clears the cookie and request-level auth context.

**Concurrent session limit:** Maximum 3 active sessions per admin user. Enforced atomically on login. When the limit is reached, the oldest sessions are deleted before creating a new one.

**Session cleanup job:** A scheduled cron job (`cleanup-expired-sessions`) runs every hour at minute 30. It deletes all session rows where `expires < now`. Each run is tracked in the jobs system with success/failure status and row count.

**Password change:** When an admin changes their password, all existing sessions are deleted and a new session is created, all within a single Prisma transaction. The admin remains logged in with the new session; all other devices are logged out.

---

## 6. Security Hardening

### Refresh Token Storage

On native platforms (iOS/Android), refresh tokens are stored using `expo-secure-store`, which uses the iOS Keychain and Android EncryptedSharedPreferences. These are hardware-backed stores that other apps cannot access.

On web, the refresh token is set by the server as an httpOnly cookie. JavaScript cannot read, modify, or exfiltrate it. This eliminates XSS as a vector for refresh token theft.

The server never stores raw tokens. All stored tokens (both user refresh tokens and admin session tokens) are SHA-256 hashed before being written to the database. A database leak exposes only hashes.

### Rate Limiting

Application-level rate limiting is applied to three user auth endpoints:

| Endpoint | Method | Limit |
|---|---|---|
| `/auth/login` | POST | 10 requests per minute per IP |
| `/auth/register` | POST | 10 requests per minute per IP |
| `/auth/refresh` | POST | 10 requests per minute per IP |

Implementation uses an in-memory bucket store keyed by IP address. When the limit is exceeded, the server returns 429 with a `Retry-After` header and a `{ code: "TOO_MANY_REQUESTS" }` body.

Limits are configurable via environment variables: `AUTH_RATE_LIMIT_MAX` (default 10) and `AUTH_RATE_LIMIT_WINDOW_MS` (default 60000).

### Cookie Configuration

Admin session cookies are set with:
- `httpOnly: true` (not accessible to JavaScript)
- `secure: true` (HTTPS only)
- `sameSite: "none"` (required for cross-origin deployment where frontend and backend are on different domains)
- `path: "/"` (available to all routes)

The `set` and `clear` operations use the same attribute helpers to guarantee consistency. A mismatch between set and clear attributes can cause silent cookie retention.

---

## 7. API Contract

### User Auth Endpoints

| Endpoint | Method | Auth Required | Purpose | Success Response |
|---|---|---|---|---|
| `/auth/register` | POST | No | Create account | `{ accessToken, refreshToken, user }` |
| `/auth/login` | POST | No | Authenticate | `{ accessToken, refreshToken, user }` |
| `/auth/refresh` | POST | No (uses refresh token) | Rotate tokens | `{ accessToken, refreshToken }` |
| `/auth/me` | GET | Yes (Bearer) | Load user data | `{ id, email, username, name, image, role, onboardingRequired }` |
| `/auth/logout` | POST | No (uses refresh token) | Revoke session | `{ status: "success" }` |
| `/auth/sessions/revoke-all` | POST | Yes (Bearer) | Revoke all sessions | `{ revoked: true }` |
| `/auth/onboarding/complete` | POST | Yes (Bearer) | Set username | `{ success: true }` |
| `/auth/google` | POST | No | Google OAuth login | `{ accessToken, refreshToken, user }` |

For `/auth/refresh`: on native, the refresh token is sent in the request body. On web, the server reads it from the httpOnly cookie. The body field is ignored on web.

### Admin Auth Endpoints

| Endpoint | Method | Auth Required | Purpose | Success Response |
|---|---|---|---|---|
| `/admin/auth/login` | POST | No | Admin login | `{ status: "success" }` + sets cookie |
| `/admin/auth/me` | GET | Yes (cookie) | Load admin data | `{ status: "success", data: { id, email, role, name } }` |
| `/admin/auth/logout` | POST | Yes (cookie) | Admin logout | `{ status: "success" }` + clears cookie |
| `/admin/auth/sessions/revoke-all` | POST | Yes (cookie) | Revoke all admin sessions | `{ revoked: true }` + clears cookie |
| `/admin/auth/change-password` | POST | Yes (cookie) | Change password | `{ status: "success" }` + rotates session |

All other `/admin/*` routes require an authenticated admin session. This is enforced globally by the admin-auth plugin, not per-route.

---

## 8. Known Limitations and Tradeoffs

**Rate limiting is in-memory.** Each server instance maintains its own bucket store. With horizontal scaling (multiple instances behind a load balancer), an attacker can distribute requests across instances to exceed the intended limit. For a single-instance deployment this is sufficient. For multi-instance, a shared store (Redis) is needed.

**Admin auth endpoints are not rate-limited.** The rate limiting plugin covers `/auth/login`, `/auth/register`, and `/auth/refresh` but not `/admin/auth/login`. Admin brute force is mitigated by the fact that admin accounts are not publicly discoverable, but adding rate limiting to the admin login endpoint is recommended.

**Revoke-all has no UI on mobile.** The `POST /auth/sessions/revoke-all` endpoint exists and works, but there is no mobile API wrapper function in `auth.api.ts` and no screen that exposes the feature to users.

**Revoke-all has no UI on admin.** The `POST /admin/auth/sessions/revoke-all` endpoint exists but is not exposed in the admin dashboard interface.

**Proactive refresh uses a fixed window.** The timer fires two minutes before token expiry, not at a percentage of TTL. For very short TTLs (under five minutes), this means the refresh fires almost immediately after token issuance. For the current server-configured TTL this is not an issue.

**NetInfo fallback in Expo Go.** When running in Expo Go (managed client), the native NetInfo module is unavailable. The connectivity wrapper detects this and falls back to browser APIs or optimistic defaults. Connectivity-based recovery will not work in Expo Go.

**SameSite "none" requires HTTPS.** The admin cookie uses `sameSite: "none"` and `secure: true`. This means admin auth does not work over plain HTTP, including local development without HTTPS. This is intentional for security.

**One `as any` cast in applyAuthResult.** The register endpoint returns a minimal user shape that does not include `role` or `onboardingRequired`. The client infers these fields and casts to the full User type. This is a known deviation from strict typing.

---

## 9. Future Extensions

**User-facing "Logout from all devices."** Add a wrapper in `auth.api.ts` for `/auth/sessions/revoke-all` and surface it in the mobile profile/settings screen.

**Redis-based rate limiting.** Replace the in-memory bucket store with a Redis-backed store to support horizontal scaling. The plugin interface can remain the same; only the store implementation changes.

**Admin login rate limiting.** Add `/admin/auth/login` to the rate-limited paths set.

**Device-level session visibility.** Expose a list of active refresh sessions to the user (device name, last used, location) so they can revoke individual sessions selectively.

**Admin security audit log.** Record login, logout, password change, and revoke-all events in a dedicated audit table with timestamps, IP addresses, and user agents.

**Email alerts on security events.** Notify users on new login from an unrecognized device, revoke-all action, or password change.

**Biometric unlock.** On native platforms, use `expo-local-authentication` to require Face ID / fingerprint before releasing the refresh token from SecureStore.

**Percentage-based proactive refresh.** Replace the fixed two-minute window with a configurable percentage of TTL (e.g., 75%) so the behavior scales with different TTL configurations.

---

## 10. Summary

The authentication system provides two fully independent auth models: JWT-based for users and session-cookie-based for admins. Both models store only hashed tokens server-side, rotate tokens atomically, and handle failure states explicitly.

Key properties:
- **No ambiguous states.** The six-state machine eliminates the "authenticated but no token" limbo that existed previously. Every failure path leads to a named state with defined behavior.
- **Single-flight refresh.** Concurrent 401s do not trigger concurrent refresh calls. One refresh runs; others wait.
- **Proactive resilience.** Tokens are refreshed before they expire, not just after a 401. App resume and connectivity recovery are handled automatically.
- **Defense in depth.** SecureStore on native, httpOnly cookies on web, hashed tokens in the database, rate limiting on auth endpoints, atomic token rotation, concurrent session limits.

Do not change the token storage strategy, the state machine states, or the refresh rotation logic without understanding the security and UX implications documented above.
