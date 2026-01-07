# Authentication Contract Compliance Audit

**Date**: Current implementation  
**Status**: ✅ **COMPLIANT**

This document verifies that the current codebase satisfies all rules defined in `AUTH_CONTRACT.md`.

---

## 1. Token Storage Rules ✅

### Refresh Tokens
- ✅ Stored in SecureStore (native) / localStorage (web)
- ✅ Key: `"user_refresh_token"` (constant `REFRESH_TOKEN_KEY`)
- ✅ Survives app restarts
- ✅ Cleared only on logout or auth failure

**Verified in**: `apps/mobile/lib/auth/auth.storage.ts`

### Access Tokens
- ✅ Stored in memory only (React state + ref)
- ✅ **NO** persistence found in codebase (grep verified)
- ✅ Retrieved via `getAccessTokenCallback()` mechanism
- ✅ Cleared on logout/auth failure

**Verified in**: `apps/mobile/lib/auth/AuthProvider.tsx` (lines 34, 65-66, 191-192)

---

## 2. Access Token Usage Rules ✅

### Token Resolution
- ✅ Protected requests use `getAccessTokenCallback()` (via `apiFetchWithAuthRetry`)
- ✅ Callback reads from `accessTokenRef.current` (not state)
- ✅ No manual caching found

**Verified in**: `apps/mobile/lib/http/apiClient.ts` (lines 135-136, 249)

### Missing Token Handling
- ✅ Fails fast with `ApiError(401, "NO_ACCESS_TOKEN")` (line 142-146)
- ✅ `NO_ACCESS_TOKEN` excluded from refresh (line 158)
- ✅ `NO_ACCESS_TOKEN` excluded from logout (never enters retry block)
- ✅ Bubbles to caller (bootstrap handles it, line 159)

**Verified in**: `apps/mobile/lib/http/apiClient.ts` (lines 141-147, 155-159)

---

## 3. Refresh Rules ✅

### Trigger Conditions
- ✅ Triggered only on HTTP 401 (line 155-159)
- ✅ NOT triggered on `NO_ACCESS_TOKEN` (excluded, line 158)
- ✅ NOT triggered on network errors (status 0)

**Verified in**: `apps/mobile/lib/http/apiClient.ts` (lines 155-159)

### Concurrency Control
- ✅ Single-flight lock via `refreshPromiseRef` (line 35)
- ✅ Concurrent requests share same promise (lines 47-48)
- ✅ Promise cleared in `finally` block (line 90)

**Verified in**: `apps/mobile/lib/auth/AuthProvider.tsx` (lines 35, 47-48, 52, 90)

### Refresh Failure Handling
- ✅ `"unauthorized"` / `"no_refresh_token"` → logout (lines 174-180)
- ✅ `"network"` / `"unknown"` → keep tokens, bubble error (line 182)

**Verified in**: `apps/mobile/lib/http/apiClient.ts` (lines 171-183)

---

## 4. Error Handling Rules ✅

### Network Errors
- ✅ Network errors (status 0) do NOT clear tokens in `refreshAccessToken()` (lines 82-83)
- ✅ Network errors do NOT clear tokens in `bootstrap()` (lines 123-129)
- ✅ Network errors preserve refresh tokens
- ✅ Network errors bubble to caller/UI

**Verified in**: 
- `apps/mobile/lib/auth/AuthProvider.tsx` (lines 82-83, 123-129, 159-168)
- `apps/mobile/lib/http/apiClient.ts` (lines 171-183)

### Auth Errors
- ✅ 401 errors (except `NO_ACCESS_TOKEN`) clear tokens (lines 74-78, 145-157)
- ✅ 401 errors trigger logout callback (lines 178-180)
- ✅ 401 errors set status to "guest" (line 153)

**Verified in**: 
- `apps/mobile/lib/auth/AuthProvider.tsx` (lines 74-78, 145-157)
- `apps/mobile/lib/http/apiClient.ts` (lines 178-180)

### NO_ACCESS_TOKEN Errors
- ✅ Does NOT trigger refresh (excluded from retry, line 158)
- ✅ Does NOT trigger logout (never enters retry block)
- ✅ Bubbles to caller (bootstrap handles, line 159)

**Verified in**: `apps/mobile/lib/http/apiClient.ts` (lines 141-147, 155-159)

---

## 5. Logout Rules ✅

### Idempotency
- ✅ Safe to call multiple times (no-op if already logged out)
- ✅ `finally` block ensures cleanup always runs (lines 188-196)

### Execution Order
- ✅ Local cleanup always executes (`finally` block, lines 188-196)
- ✅ Server revocation is best-effort (errors ignored, lines 180-184)
- ✅ Local state cleared even if server fails

### Error Handling
- ✅ Does NOT throw errors (all errors caught and ignored)
- ✅ Server failures silently ignored (lines 182-184, 186-187)

### State After Logout
- ✅ Status set to "guest" (line 194)
- ✅ Access token cleared (lines 191-192)
- ✅ Refresh token cleared (line 190)
- ✅ User data cleared (line 193)
- ✅ Error cleared (line 195)

**Verified in**: `apps/mobile/lib/auth/AuthProvider.tsx` (lines 175-197)

---

## 6. Bootstrap Rules ✅

### Initial State
- ✅ App starts in "loading" (line 29)
- ✅ Bootstrap called on mount (via `useEffect`, line 287)

### Refresh Token Check
- ✅ No token → "guest" (lines 106-108)
- ✅ Token exists → proceed with refresh (line 112)

### Refresh Failure Handling
- ✅ `"unauthorized"` / `"no_refresh_token"` → "guest", clear tokens (lines 115-120)
- ✅ `"network"` / `"unknown"` → keep tokens, "loading", show error (lines 123-129)

### Network Error Handling
- ✅ Network errors keep tokens (line 167)
- ✅ Network errors set status to "loading" (line 166)
- ✅ Network errors do NOT downgrade to "guest"

### Auth Error Handling
- ✅ 401 errors (except `NO_ACCESS_TOKEN`) clear tokens, "guest" (lines 145-157)
- ✅ `NO_ACCESS_TOKEN` keeps tokens, "loading" (line 159)

**Verified in**: `apps/mobile/lib/auth/AuthProvider.tsx` (lines 100-169)

---

## 7. UI State Consistency Rules ✅

### Status Transitions
- ✅ "loading" does NOT redirect to login (shows loading indicator)
- ✅ "guest" redirects away from protected routes (line 17-18)
- ✅ "authed" allows protected routes (line 21)

**Verified in**: `apps/mobile/app/(protected)/_layout.tsx` (lines 9-21)

### Protected Route Guards
- ✅ Checks auth status before rendering (line 7)
- ✅ Shows loading indicator when "loading" (lines 9-14)
- ✅ Redirects to login when "guest" (lines 17-18)
- ✅ Renders content when "authed" (line 21)

**Verified in**: `apps/mobile/app/(protected)/_layout.tsx`

---

## 8. Concurrency Invariants ✅

### Refresh Concurrency
- ✅ Only one refresh in progress (single-flight lock)
- ✅ Concurrent 401s share same promise
- ✅ All requests use same new token after refresh

**Verified in**: `apps/mobile/lib/auth/AuthProvider.tsx` (lines 35, 47-48, 52, 90)

### Token Access
- ✅ Callback reads from `accessTokenRef.current` (line 249)
- ✅ State and ref updated atomically (lines 65-66, 191-192)
- ✅ No race conditions (ref always has latest value)

**Verified in**: `apps/mobile/lib/auth/AuthProvider.tsx` (lines 65-66, 191-192, 249)

---

## 9. Security Invariants ✅

### Token Storage
- ✅ Refresh tokens hashed before DB storage (server-side)
- ✅ Raw tokens never stored in DB (server-side)
- ✅ Access tokens are signed JWTs with expiration (server-side)

### Token Rotation
- ✅ Atomic rotation (server-side transaction)
- ✅ Old token revoked before new created (server-side)
- ✅ Rotation on every refresh (server-side)

### Token Validation
- ✅ Access tokens validated on every request (server-side)
- ✅ Refresh tokens validated before rotation (server-side)
- ✅ Expired tokens rejected immediately (server-side)

---

## 10. Error Recovery Rules ✅

### Network Recovery
- ✅ Network errors recoverable without logout
- ✅ Network errors preserve tokens
- ✅ Network errors allow manual retry

### Auth Recovery
- ✅ Auth failures require re-login
- ✅ Auth failures clear all tokens
- ✅ Auth failures set status to "guest"

---

## Final Sanity Checks ✅

### No Auth Loops
- ✅ Bootstrap called only once on mount (no recursion)
- ✅ Refresh has single-flight lock (prevents infinite refresh)
- ✅ Retry after refresh happens only once (no loop)

**Verified**: No recursive calls found, single-flight lock enforced

### No Token Races
- ✅ Single refresh promise shared by all concurrent requests
- ✅ Token state and ref updated atomically
- ✅ Callback always reads from ref (not state)

**Verified**: `refreshPromiseRef` and `accessTokenRef` properly managed

### Network Failures Recoverable
- ✅ Network errors preserve tokens
- ✅ Network errors keep app in "loading" (not "guest")
- ✅ Network errors allow retry without re-login

**Verified**: Network error handling in bootstrap and refresh

### Auth Failures Deterministic
- ✅ Auth failures always clear tokens
- ✅ Auth failures always set status to "guest"
- ✅ Auth failures always require re-login

**Verified**: Consistent auth failure handling throughout

---

## Conclusion

**All contract rules are satisfied. The implementation is compliant.**

No changes required. The codebase correctly implements all invariants defined in `AUTH_CONTRACT.md`.

