# Authentication Contract

This document defines the authoritative rules and invariants for the mobile app authentication system. All implementations must respect these rules. Any future changes must maintain contract compliance.

---

## 1. Token Storage Rules

### Refresh Tokens
- **MUST** be persisted in secure storage (SecureStore on native, localStorage on web)
- **MUST** be stored using the key `"user_refresh_token"`
- **MUST** survive app restarts
- **MUST** be cleared only on:
  - Explicit logout
  - Auth failure (401 unauthorized)
  - User-initiated account deletion

### Access Tokens
- **MUST** be stored in memory only (React state + ref)
- **MUST NOT** be persisted to any storage mechanism (SecureStore, localStorage, AsyncStorage, etc.)
- **MUST NOT** be cached outside the auth context
- **MUST** be retrieved via the central `getAccessTokenCallback()` mechanism
- **MUST** be cleared on logout or auth failure

### Token Rotation
- Refresh tokens **MUST** rotate on every successful refresh call
- Old refresh token **MUST** be revoked before new one is created (atomic operation)
- Access tokens **MUST** be regenerated on every refresh

---

## 2. Access Token Usage Rules

### Token Resolution
- Protected API requests **MUST** resolve the access token via the central callback mechanism
- The callback **MUST** read from `accessTokenRef.current` (not state) to avoid stale closures
- No API call **MAY** manually cache or persist access tokens
- No API call **MAY** store access tokens in closures or module-level variables

### Missing Token Handling
- Missing access tokens **MUST** fail fast with `ApiError(401, "NO_ACCESS_TOKEN")`
- `NO_ACCESS_TOKEN` errors **MUST NOT** trigger refresh
- `NO_ACCESS_TOKEN` errors **MUST NOT** trigger logout
- `NO_ACCESS_TOKEN` errors **MUST** bubble to the caller (bootstrap/login) for handling

---

## 3. Refresh Rules

### Trigger Conditions
- Refresh **MUST** be triggered only on HTTP 401 errors from the server
- Refresh **MUST NOT** be triggered on:
  - `NO_ACCESS_TOKEN` errors (missing token, not expired)
  - Network errors (status 0)
  - Other HTTP status codes

### Concurrency Control
- Refresh **MUST** be single-flight (only one refresh in progress at any time)
- Concurrent refresh requests **MUST** share the same refresh promise
- The refresh promise **MUST** be stored in `refreshPromiseRef.current`
- The refresh promise **MUST** be cleared in a `finally` block after completion

### Refresh Failure Handling
- Refresh failures **MUST** be categorized by reason:
  - `"unauthorized"` or `"no_refresh_token"` → **MUST** logout (clear tokens)
  - `"network"` or `"unknown"` → **MUST** keep tokens and bubble error
- Network refresh failures **MUST NOT** trigger logout
- Auth refresh failures **MUST** trigger logout

---

## 4. Error Handling Rules

### Network Errors
- Network errors (status 0, `NETWORK_ERROR` code) **MUST NOT** clear tokens
- Network errors **MUST** preserve refresh tokens for retry
- Network errors **MUST** bubble to caller/UI for retry handling
- Network errors during bootstrap **MUST** keep app in `"loading"` state (not `"guest"`)

### Auth Errors
- Auth errors (401 with code other than `NO_ACCESS_TOKEN`) **MUST** clear tokens
- Auth errors **MUST** trigger logout callback
- Auth errors **MUST** set status to `"guest"`
- Auth errors **MUST NOT** preserve tokens for retry

### NO_ACCESS_TOKEN Errors
- `NO_ACCESS_TOKEN` errors **MUST NOT** trigger refresh callback
- `NO_ACCESS_TOKEN` errors **MUST NOT** trigger logout callback
- `NO_ACCESS_TOKEN` errors **MUST** bubble to caller
- Bootstrap/login **MUST** handle `NO_ACCESS_TOKEN` gracefully (keep tokens, show loading)

---

## 5. Logout Rules

### Idempotency
- Logout **MUST** be idempotent (safe to call multiple times)
- Calling logout when already logged out **MUST** be a no-op

### Execution Order
- Local cleanup **MUST** always execute (in `finally` block)
- Server revocation **MUST** be best-effort (errors ignored)
- Local state **MUST** be cleared even if server call fails

### Error Handling
- Logout **MUST NOT** throw errors
- Server revocation failures **MUST** be silently ignored
- Local storage failures **MUST** be silently ignored (best-effort cleanup)

### State After Logout
- Status **MUST** be set to `"guest"`
- Access token **MUST** be cleared from memory
- Refresh token **MUST** be cleared from storage
- User data **MUST** be cleared
- Error state **MUST** be cleared

---

## 6. Bootstrap Rules

### Initial State
- App **MUST** start in `"loading"` status
- Bootstrap **MUST** be called on app mount (via `useEffect`)

### Refresh Token Check
- If no refresh token exists → **MUST** set status to `"guest"` and return
- If refresh token exists → **MUST** proceed with refresh

### Refresh Failure Handling
- `"unauthorized"` or `"no_refresh_token"` → **MUST** set status to `"guest"`, clear tokens
- `"network"` or `"unknown"` → **MUST** keep tokens, set status to `"loading"`, show error

### Network Error Handling
- Network errors during `/auth/me` call → **MUST** keep tokens, set status to `"loading"`
- Network errors **MUST NOT** downgrade to `"guest"`
- Network errors **MUST** allow retry without re-login

### Auth Error Handling
- 401 errors (except `NO_ACCESS_TOKEN`) → **MUST** clear tokens, set status to `"guest"`
- `NO_ACCESS_TOKEN` errors → **MUST** keep tokens, set status to `"loading"`

---

## 7. UI State Consistency Rules

### Status Transitions
- `"loading"` **MUST NOT** redirect to login
- `"loading"` **MUST** show loading indicator
- `"guest"` **MUST** redirect away from protected routes
- `"guest"` **MUST** allow access to public/auth routes
- `"authed"` **MUST** allow access to protected routes
- `"authed"` **MUST** redirect away from auth routes (login/register)

### Protected Route Guards
- Protected routes **MUST** check auth status before rendering
- Protected routes **MUST** show loading indicator when status is `"loading"`
- Protected routes **MUST** redirect to login when status is `"guest"`
- Protected routes **MUST** render content when status is `"authed"`

---

## 8. Concurrency Invariants

### Refresh Concurrency
- Only one refresh operation **MAY** be in progress at any time
- Concurrent 401s **MUST** share the same refresh promise
- All concurrent requests **MUST** use the same new access token after refresh

### Token Access
- Access token reads **MUST** use `accessTokenRef.current` (not state) in callbacks
- Access token state and ref **MUST** be updated atomically
- No race conditions **MAY** exist between token state and ref

---

## 9. Security Invariants

### Token Storage
- Refresh tokens **MUST** be hashed (SHA-256) before database storage
- Raw refresh tokens **MUST** never be stored in database
- Access tokens **MUST** be signed JWTs with expiration

### Token Rotation
- Refresh token rotation **MUST** be atomic (single transaction)
- Old refresh token **MUST** be revoked before new one is created
- Rotation **MUST** happen on every refresh call (not just on expiry)

### Token Validation
- Access tokens **MUST** be validated on every protected request
- Refresh tokens **MUST** be validated before rotation
- Expired tokens **MUST** be rejected immediately

---

## 10. Error Recovery Rules

### Network Recovery
- Network errors **MUST** be recoverable without logout
- Network errors **MUST** preserve tokens for retry
- Network errors **MUST** allow manual retry (via UI or automatic retry)

### Auth Recovery
- Auth failures **MUST NOT** be recoverable without re-login
- Auth failures **MUST** clear all tokens
- Auth failures **MUST** require user to log in again

---

## Contract Compliance

All code changes must:
1. Maintain these invariants
2. Not introduce token persistence for access tokens
3. Not bypass the refresh concurrency lock
4. Not clear tokens on network errors
5. Not skip logout on auth failures
6. Not break UI state consistency

**This contract is authoritative. Violations are bugs.**

