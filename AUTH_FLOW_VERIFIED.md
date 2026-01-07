# Verified Authentication Flow Documentation

This document describes the exact runtime behavior of the authentication system as implemented in the codebase. All function names, file paths, and behaviors are verified against the actual code.

**Last Verified**: Based on code as of latest changes (network error handling fixes applied)

---

## Storage Rules

### Refresh Token Storage

**File**: `apps/mobile/lib/auth/auth.storage.ts`

- **Location**:
  - Native: `expo-secure-store` (SecureStore)
  - Web: `localStorage`
  - Fallback: `localStorage` if SecureStore unavailable on native
- **Key**: `"user_refresh_token"` (constant `REFRESH_TOKEN_KEY`)
- **Storage functions**:
  - `getRefreshToken()` - reads from SecureStore/localStorage
  - `setRefreshToken(token)` - writes to SecureStore/localStorage
  - `clearRefreshToken()` - removes from SecureStore/localStorage
- **Persistence**: Survives app restarts, cleared only on logout or auth failure (401)

### Access Token Storage

**File**: `apps/mobile/lib/auth/AuthProvider.tsx`

- **Location**: React state (`accessToken`) + ref (`accessTokenRef.current`)
- **Storage**: Memory only, never persisted
- **Access mechanism**:
  - Direct: `accessToken` state variable
  - Via callback: `getAccessTokenCallback()` returns `accessTokenRef.current`
  - Callback set in `useEffect` (line 249): `setGetAccessTokenCallback(() => accessTokenRef.current)`
- **Lifetime**: 15 minutes (enforced by JWT `expiresIn` in `generateAccessToken`)

---

## 1. App Cold Start (Bootstrap)

**File**: `apps/mobile/lib/auth/AuthProvider.tsx`  
**Function**: `bootstrap()` (lines 92-144)  
**Trigger**: `useEffect` on mount (lines 252-255)

### Execution Flow

1. **Initial state** (lines 94-95):
   - Sets `status = "loading"`
   - Clears `error = null`

2. **Read refresh token** (line 97):
   - Calls `authStorage.getRefreshToken()` from `apps/mobile/lib/auth/auth.storage.ts`
   - If no token found → sets `status = "guest"` and returns (lines 98-100)

3. **Refresh access token** (line 104):
   - Calls `refreshAccessToken()` (see Section 4 for details)
   - If returns `null` → sets `status = "guest"` and returns (lines 105-107)
   - If succeeds → stores access token in state and ref (lines 111-112)

4. **Fetch user data** (line 115):
   - Calls `authApi.me()` which uses `apiFetchWithAuthRetry("/auth/me", { method: "GET" })`
   - Token automatically retrieved via `getAccessTokenCallback()`
   - On success → sets `user` and `status = "authed"` (lines 116-117)

5. **Error handling** (catch block, lines 118-143):
   - **401 error** (`err instanceof ApiError && err.status === 401`):
     - Sets error message
     - Sets `status = "guest"`
     - Clears refresh token from SecureStore
     - Clears access token from memory
     - Clears user data
   - **Network error or other** (else branch):
     - Sets error message (includes "Failed to connect..." for non-Error types)
     - Sets `status = "guest"` (with comment suggesting "loading" with retry UI could be used)
     - **Tokens remain stored** (not cleared) - allows retry when network available

---

## 2. Login with Email & Password

**Mobile**: `apps/mobile/lib/auth/AuthProvider.tsx` → `login()` (lines 176-242)  
**Server**: `apps/server/src/services/auth/user-auth.service.ts` → `login()` (lines 145-225)  
**Route**: `apps/server/src/routes/auth/auth.route.ts` → POST `/auth/login` (lines 100-112)

### Mobile Flow

1. **Login request** (line 180):
   - Calls `authApi.login(emailOrUsername, password)`
   - Which calls `apiFetch("/auth/login", { method: "POST", body: { emailOrUsername, password } })` (auth.api.ts, lines 15-23)

2. **Server processing** (user-auth.service.ts, lines 155-224):
   - Normalizes email to lowercase (line 163)
   - Finds user by email (normalized) OR username (line 164-176)
   - Verifies password with bcrypt (line 184)
   - Wraps in `prisma.$transaction()` (line 190)
   - Creates refresh session: `createUserRefreshSession(tx, user.id, now)` (lines 191-195)
   - Updates `lastLoginAt` (lines 197-201)
   - Generates JWT access token (15 min TTL) (lines 203-208)
   - Returns both tokens

3. **Token storage** (lines 183-187):
   - Stores refresh token: `authStorage.setRefreshToken(response.refreshToken)`
   - Stores access token in state: `setAccessToken(response.accessToken)`
   - Stores access token in ref: `accessTokenRef.current = response.accessToken`

4. **Fetch user data** (lines 191-232):
   - Calls `authApi.me()` which uses `apiFetchWithAuthRetry`
   - **Network error handling** (status 0, lines 198-206):
     - Sets `user = null`
     - Sets `status = "authed"` (user is authed, just no user data yet)
     - Sets error message: "Connected but unable to load user data. Please try again."
     - **Does not throw** - allows user to retry `/auth/me` later
     - Tokens remain stored
   - **401 error handling** (lines 209-228):
     - Attempts refresh: `await refreshAccessToken()`
     - If refresh succeeds → retries `/auth/me` with new token
     - If retry succeeds → sets user and status
     - If retry fails OR refresh fails → calls `logout()` and throws error
   - **Other errors** (line 231): Throws as-is

5. **Login request failure** (catch block, lines 233-239):
   - Sets error message
   - Throws error (tokens not stored, status unchanged)

---

## 3. Authenticated API Call (Protected Endpoints)

**File**: `apps/mobile/lib/http/apiClient.ts`  
**Function**: `apiFetchWithAuthRetry()` (lines 127-181)

### Token Resolution

1. **Precedence** (lines 131-135):
   - If `options.accessToken` provided → use it
   - Else if `getAccessTokenCallback` exists → call it (returns `accessTokenRef.current`)
   - Else → use `null`

2. **Initial request** (line 139):
   - Calls `apiFetch()` with resolved token
   - Adds `Authorization: Bearer <token>` header if token exists (apiFetch, line 62)

### 401 Handling & Retry

3. **On 401 error** (lines 141-160):
   - Checks if `refreshCallback` exists (line 143)
   - If no callback → calls `logoutCallback()` and throws error (lines 144-148)
   - If callback exists → calls `refreshCallback()` (which is `refreshAccessToken`) (line 152)
   - If refresh returns `null` → calls `logoutCallback()` and throws original 401 (lines 154-159)

4. **Retry with new token** (lines 162-175):
   - Retries original request with new access token from refresh
   - If retry succeeds → returns response
   - If retry fails (any error) → calls `logoutCallback()` and throws retry error (not original 401)

### Network Error Handling

**File**: `apps/mobile/lib/http/apiClient.ts`  
**Function**: `apiFetch()` (lines 46-115)

- Network errors (fetch throws `TypeError: Network request failed`) are caught (lines 74-91)
- Converted to `ApiError` with `status = 0` and `code = "NETWORK_ERROR"`
- Thrown as-is (not retried, not triggering refresh)

### Concurrency Protection

**File**: `apps/mobile/lib/auth/AuthProvider.tsx`  
**Function**: `refreshAccessToken()` (lines 43-87)

- Uses `refreshPromiseRef` to store ongoing refresh promise (line 34)
- If refresh already in progress → returns existing promise (lines 45-46)
- Only one refresh request can be in-flight at a time
- All concurrent 401s share the same refresh promise
- Promise cleared in `finally` block (line 82)

---

## 4. Refresh Token Flow

**Mobile**: `apps/mobile/lib/auth/AuthProvider.tsx` → `refreshAccessToken()` (lines 43-87)  
**Server**: `apps/server/src/services/auth/user-auth.service.ts` → `refresh()` (lines 414-470)

### Mobile Request

1. **Check for existing refresh** (lines 44-46):
   - If `refreshPromiseRef.current` exists → return that promise (single-flight)

2. **Read refresh token** (line 52):
   - Calls `authStorage.getRefreshToken()`
   - If null → returns `null` immediately (lines 53-54)

3. **Call server** (line 57):
   - Calls `authApi.refresh(refreshToken)`
   - Which calls `apiFetch("/auth/refresh", { method: "POST", body: { refreshToken } })`

### Server Processing

4. **Validation** (user-auth.service.ts, lines 427-437):
   - Wraps in `prisma.$transaction()` for atomicity (line 427)
   - Calls `resolveUserRefreshSessionByRawToken(tx, refreshToken, now)` (line 429)
   - Hashes token with SHA-256 (user-refresh-session.ts, line 45)
   - Looks up session by hash (line 47)
   - Checks: session exists, not revoked (`revokedAt === null`), not expired (lines 67-77)
   - If invalid → throws `UnauthorizedError("Invalid or expired refresh token")`

5. **Token rotation** (lines 441-447):
   - Calls `rotateUserRefreshSessionTx(tx, refreshToken, user.id, now)`
   - Which atomically (user-refresh-session.ts, lines 137-161):
     - Revokes old session: `updateMany({ tokenHash, revokedAt: null }, { revokedAt: now })` (lines 151-157)
     - Creates new session: `createUserRefreshSession(client, userId, now)` (line 160)
   - Generates new JWT access token (15 min TTL) (lines 450-455)
   - Returns both new tokens

### Mobile Response Handling

6. **Store new tokens** (lines 59-64):
   - Stores new refresh token: `authStorage.setRefreshToken(response.refreshToken)`
   - Updates access token in state: `setAccessToken(response.accessToken)`
   - Updates access token in ref: `accessTokenRef.current = response.accessToken`

7. **Error handling** (lines 67-79):
   - **401 error** (`err instanceof ApiError && err.status === 401`):
     - Clears refresh token from SecureStore
     - Clears access token from memory
     - Returns `null`
   - **Network error** (status 0) or other errors:
     - **Keeps tokens** (not cleared) - allows retry
     - Returns `null`

8. **Promise cleanup** (finally block, lines 80-83):
   - Clears `refreshPromiseRef.current = null` so next refresh can proceed

---

## 5. App Restart (User Already Logged In)

**Same as Cold Start**: Uses `bootstrap()` flow (see Section 1).

**Key difference**: Refresh token exists in SecureStore, so bootstrap proceeds to refresh and fetch user data.

**If refresh token expired while app was closed**:

- Server returns 401 (token expired or not found)
- `refreshAccessToken()` catches 401, clears tokens, returns `null`
- Bootstrap sets status to "guest"
- User must log in again

**If network error during bootstrap**:

- Tokens remain stored
- Status set to "guest" with error message
- User can retry when network available

---

## 6. Logout Flow

**Mobile**: `apps/mobile/lib/auth/AuthProvider.tsx` → `logout()` (lines 149-171)  
**Server**: `apps/server/src/services/auth/user-auth.service.ts` → `logout()` (lines 475-481)

### Mobile Execution

1. **Read refresh token** (line 151):
   - Calls `authStorage.getRefreshToken()`

2. **Server notification** (lines 152-158):
   - If token exists → calls `authApi.logout(refreshToken)` (best effort)
   - Server revokes session: `revokeUserRefreshSessionByRawToken(prisma, refreshToken)` (user-auth.service.ts, line 477)
   - Sets `revokedAt = now` on matching session (user-refresh-session.ts, lines 107-113)
   - If server call fails → ignored (best effort)

3. **Local cleanup** (finally block, lines 162-170):
   - Always executes, regardless of server call success/failure:
     - Clears refresh token: `authStorage.clearRefreshToken()`
     - Clears access token: `setAccessToken(null)`
     - Clears access token ref: `accessTokenRef.current = null`
     - Clears user data: `setUser(null)`
     - Sets status: `setStatus("guest")`
     - Clears error: `setError(null)`

### Idempotency

- Safe to call multiple times
- If tokens already cleared → no-op (SecureStore returns null, state already null)
- Server call is best-effort (errors ignored)

---

## 7. Concurrency Details

### Single-Flight Refresh Lock

**File**: `apps/mobile/lib/auth/AuthProvider.tsx`  
**Storage**: `refreshPromiseRef` (line 34, type: `React.useRef<Promise<string | null> | null>`)

**Mechanism**:

1. Before starting refresh, checks if `refreshPromiseRef.current` exists (line 45)
2. If exists → returns that promise (line 46) - all callers share same promise
3. If not exists → creates new promise, stores in ref (line 50)
4. Promise cleared in `finally` block (line 82)

**Result**:

- Only ONE refresh request can be in-flight at a time
- All concurrent 401s wait for the same refresh
- All get the same new access token
- Prevents token rotation races

**Example**:

- Request A gets 401 → starts refresh, stores promise in `refreshPromiseRef.current`
- Request B gets 401 → sees promise exists, waits for it
- Request C gets 401 → sees promise exists, waits for it
- Refresh completes → all three requests retry with same new token
- Promise cleared → next refresh can proceed

**Maximum concurrent refreshes**: 1 (enforced by single-flight lock)

---

## 8. Error Handling: 401 vs Network

### Network Error Detection

**File**: `apps/mobile/lib/http/apiClient.ts`  
**Function**: `apiFetch()` (lines 74-91)

- Network errors detected when `fetch()` throws `TypeError` with message `"Network request failed"`
- Converted to `ApiError` with `status = 0` and `code = "NETWORK_ERROR"`

### 401 Error Detection

- HTTP status code 401 from server
- Wrapped in `ApiError` with `status = 401`

### Behavior Distinction

**In `refreshAccessToken()`** (AuthProvider.tsx, lines 67-79):

- **401 error**: Clears tokens, returns `null`
- **Network error (status 0)**: Keeps tokens, returns `null` (allows retry)
- **Other errors**: Keeps tokens, returns `null`

**In `bootstrap()`** (AuthProvider.tsx, lines 118-143):

- **401 error**: Clears tokens, sets status to "guest"
- **Network error or other**: Keeps tokens, sets status to "guest" with error message

**In `login()` `/auth/me` failure** (AuthProvider.tsx, lines 195-232):

- **Network error (status 0)**: Keeps tokens, sets status to "authed" with `user = null`, doesn't throw
- **401 error**: Attempts refresh once, retries `/auth/me`, if still failing → logout and throw
- **Other errors**: Throws as-is

**In `apiFetchWithAuthRetry()`** (apiClient.ts, lines 127-181):

- **401 error**: Triggers refresh and retry
- **Network error**: Thrown as-is (not retried, not triggering refresh)

---

## 9. Server-Side Token Rotation

**File**: `apps/server/src/services/auth/user-auth.service.ts`  
**Function**: `refresh()` (lines 414-470)

### Atomic Transaction

1. **Wrapped in transaction** (line 427):
   - `prisma.$transaction(async (tx) => { ... })`

2. **Resolve session** (line 429):
   - `resolveUserRefreshSessionByRawToken(tx, refreshToken, now)`
   - Uses transaction client `tx` (not global `prisma`)

3. **Rotate token** (line 442):
   - `rotateUserRefreshSessionTx(tx, refreshToken, user.id, now)`
   - Uses transaction client `tx`
   - Atomically: revokes old, creates new (user-refresh-session.ts, lines 151-160)

4. **Generate access token** (lines 450-455):
   - JWT signed with `expiresIn: Math.floor(USER_ACCESS_TOKEN_TTL_MS / 1000)` (user-tokens.ts, line 37)

### Invariant

- All refresh session DB operations use transaction client when inside transaction
- Rotation is atomic: old token revoked and new token created in same transaction
- If any step fails, entire transaction rolls back

---

## 10. Invariants Checklist

These invariants must hold true for the system to work correctly:

### Token Storage

- ✅ Refresh token stored ONLY in SecureStore/localStorage (never in memory long-term)
- ✅ Access token stored ONLY in memory (React state + ref, never persisted)
- ✅ Access token callback reads from ref (prevents stale closure)
- ✅ Access token ref updated whenever state updated (lines 64, 112, 138, 166, 187)

### Refresh Token Rotation

- ✅ Refresh token rotation is atomic (wrapped in `prisma.$transaction`)
- ✅ Old refresh token revoked BEFORE new one created (in same transaction)
- ✅ Only one refresh token valid per user at a time (pure rotation model)
- ✅ Refresh session DB operations use transaction client (`tx`) when inside transaction
- ✅ `rotateUserRefreshSessionTx` used for atomic rotation (not `rotateUserRefreshSession`)

### Access Token

- ✅ Access token TTL enforced by JWT `expiresIn` (15 minutes, user-tokens.ts line 37)
- ✅ Access token never persisted (memory only)
- ✅ Access token refreshed automatically on 401

### Concurrency

- ✅ Only one refresh request in-flight at a time (single-flight lock via `refreshPromiseRef`)
- ✅ Concurrent 401s share the same refresh promise
- ✅ All concurrent requests use the same new access token after refresh
- ✅ Promise cleared in `finally` block (ensures next refresh can proceed)

### Error Handling

- ✅ Network errors (status 0) do NOT clear tokens in `refreshAccessToken()`
- ✅ Network errors (status 0) do NOT clear tokens in `bootstrap()`
- ✅ 401 errors clear tokens in `refreshAccessToken()`
- ✅ 401 errors clear tokens in `bootstrap()`
- ✅ `/auth/me` network failure after login keeps tokens, sets status to "authed" with `user = null`
- ✅ `/auth/me` 401 failure after login attempts refresh once, then logout if still failing

### Server Behavior

- ✅ `/auth/me` fetches user from database (not from JWT payload) (auth.route.ts, lines 169-179)
- ✅ Refresh token hashed with SHA-256 before storage (user-tokens.ts, line 68)
- ✅ Refresh token expiry checked on every resolve (user-refresh-session.ts, lines 72-77)
- ✅ Revoked sessions cannot be used (checked in `resolveUserRefreshSessionByRawToken`, line 70)
- ✅ Access token TTL enforced by `expiresIn` when signing (user-tokens.ts, line 37)

### Logout

- ✅ Logout is idempotent (safe to call multiple times)
- ✅ Local cleanup always executes (finally block)
- ✅ Server revocation is best-effort (errors ignored)

### Database Operations

- ✅ No refresh token DB writes outside transaction client when inside transaction
- ✅ `createUserRefreshSession` accepts transaction client (used in register, login, google, refresh)
- ✅ `resolveUserRefreshSessionByRawToken` accepts transaction client (used in refresh)
- ✅ `rotateUserRefreshSessionTx` accepts transaction client (used in refresh)

---

## Summary

The authentication system implements:

- ✅ Secure token storage (refresh in SecureStore, access in memory)
- ✅ Automatic token refresh on 401
- ✅ Atomic token rotation (transaction-wrapped)
- ✅ Single-flight refresh concurrency protection
- ✅ Network error resilience (tokens preserved on network failures)
- ✅ Idempotent logout

**All invariants verified**: The code correctly distinguishes between network errors and auth failures, preserving tokens on network issues while clearing them on authentication failures.
