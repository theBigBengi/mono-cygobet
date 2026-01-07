# Onboarding Contract

This document defines the authoritative rules and invariants for the onboarding gate.

---

## 1. Definitions

- **onboardingRequired**:
  - A boolean field returned by `/auth/me`.
  - Computed server-side via `isOnboardingRequired()`.
  - `true` means the user must complete onboarding before accessing protected resources.
- **onboardingDone**:
  - Represented in the database by `user_profiles.onboarding_done = true` and `user_profiles.onboarding_done_at != null`.
  - Additionally requires that `users.username` is present and valid (non-empty, trimmed).

---

## 2. Server Responsibilities

### Profile Existence

- Every user **MUST** have exactly one `user_profiles` row.
- Profile creation **MUST** be enforced in all user creation paths (email/password, Google OAuth, admin-created users).
- `ensureUserProfile()` **MUST** be used in transactions that create users.

### Computation of onboardingRequired

- `isOnboardingRequired(client, userId)` is the **single source of truth**.
- A user is considered `onboardingRequired === true` if **any** of the following holds:
  - `user_profiles.onboarding_done` is `false` or the profile row is missing.
  - `users.username` is `null` or empty/whitespace.
- No other code path **MAY** compute onboarding logic independently.

### Guard Rules (403 ONBOARDING_REQUIRED)

- Protected routes that require a fully onboarded user **MUST** use `fastify.userAuth.requireOnboardingComplete`.
- `requireOnboardingComplete` **MUST**:
  - Assert authentication (deny guests with 401 `UNAUTHORIZED`).
  - Call `isOnboardingRequired()`.
  - If onboarding is required → throw `ForbiddenError` with:
    - HTTP status `403`.
    - Error code `"ONBOARDING_REQUIRED"`.
- The following routes **MUST NOT** be blocked by onboarding:
  - `/auth/login`, `/auth/register`, `/auth/google`, `/auth/refresh`, `/auth/logout`.
  - `/auth/me` (needed to fetch `onboardingRequired`).
  - `/auth/onboarding/complete`.

---

## 3. Mobile Responsibilities

### Routing Rules

- `status === "loading"`:
  - **MUST NOT** redirect to login.
  - **MUST** show loading UI.
- `status === "guest"`:
  - **MUST** redirect away from protected routes (to login/auth routes).
- `status === "authed"`:
  - When `user.onboardingRequired === true` → **MUST** route to onboarding group.
  - When `user.onboardingRequired === false` → **MUST** allow access to protected routes.

### Onboarding Group Behavior

- Onboarding routes (e.g. `/(onboarding)/username`) **MUST**:
  - Be accessible only when `status === "authed"` and `user.onboardingRequired === true`.
  - Redirect authed users with `onboardingRequired === false` to the protected app.
  - Redirect guests to login.

### Persistence Behavior

- Onboarding state **MUST NOT** be stored locally outside `user.onboardingRequired`.
- On every app start / session restore:
  - `/auth/me` **MUST** be called (after refresh) to obtain `onboardingRequired`.
  - Routing decisions **MUST** be derived solely from `/auth/me` and `status`.
- If the app is closed mid-onboarding:
  - Next boot/login **MUST** route back into onboarding as long as `/auth/me` reports `onboardingRequired === true`.

---

## 4. API Contract

### /auth/me

- **MUST** return:
  - `id, email, username, name, image, role`.
  - `onboardingRequired: boolean` computed via `isOnboardingRequired()`.

### /auth/onboarding/complete

- **Purpose**: finalize onboarding by setting username and marking onboarding as done.
- **Requirements**:
  - **Authentication**: user identity **MUST** come from the access token (not client-provided IDs).
  - **Username validation**:
    - Length 3–50 characters.
    - Allowed characters: letters, numbers, underscores, hyphens.
  - **Username uniqueness**:
    - Must be unique across all users.
  - **Atomic update**:
    - In a single transaction, the server **MUST**:
      - Update `users.username`.
      - Update `user_profiles.onboarding_done = true` and `user_profiles.onboarding_done_at = now`.

---

## 5. Error Handling

### 403 ONBOARDING_REQUIRED

- Server:
  - **MUST** return HTTP 403 with error code `"ONBOARDING_REQUIRED"` when onboarding is required on a protected route.
- Mobile:
  - **MUST** route the user into the onboarding flow when this error is received.
  - **MUST NOT** logout on `ONBOARDING_REQUIRED`.
  - **MUST NOT** clear tokens on `ONBOARDING_REQUIRED`.

### Other Errors

- Auth errors (401) **MUST** follow auth contract rules (clear tokens, require re-login).
- Network errors **MUST** preserve tokens and allow retry.

---

## 6. Acceptance Criteria

1. **Register → Onboarding**
   - After a new registration, the user **MUST** end up in the onboarding flow (username completion) before protected access.
2. **App Restart Mid-Onboarding**
   - If the app is closed while `onboardingRequired === true`, the next boot/login **MUST** route to the onboarding flow.
3. **Onboarding Completion**
   - After successful `/auth/onboarding/complete`, `/auth/me` **MUST** return `onboardingRequired === false`.
   - Protected routes **MUST** be accessible without 403.
4. **Protected API Calls While Onboarding**
   - Protected endpoints **MUST** respond with 403 `ONBOARDING_REQUIRED`.
   - Mobile **MUST** route to onboarding and **MUST NOT** logout.
5. **Post-Onboarding Normal Access**
   - Once `onboardingRequired === false`, the user **MUST** be treated as a normal authed user with full access to protected routes.

---

## Contract Enforcement

Any change to onboarding behavior **MUST** remain consistent with this contract:

- Server remains the single source of truth for `onboardingRequired`.
- Client derives onboarding state only from `/auth/me`.
- Guards and routing **MUST** respect the invariants above.

---

## 7. Example Protected Endpoint

- Endpoint: `GET /api/users/profile`
- Behavior:
  - Uses `fastify.userAuth.requireOnboardingComplete` as preHandler.
  - Returns merged `user` + `profile` data for the authenticated user.
  - While `onboardingRequired === true`, calls to this endpoint **MUST** receive 403 `ONBOARDING_REQUIRED`.
  - Once onboarding is completed (`onboardingRequired === false`), calls **MUST** succeed with 200 OK.

---

## 7. Routing & Endpoint Usage Rules

- Public main route **MUST NOT** call any protected endpoints.
- Protected routes **MUST NOT** call `/auth/me` directly; onboarding state comes from `/auth/me` via AuthProvider only.
- Profile route **MUST** use `/api/users/profile` as its source of domain data.
- `ONBOARDING_REQUIRED` responses **MUST NOT** cause logout.
- Protected home fixtures endpoint (`/fixtures/upcoming`) **MUST** use `fastify.userAuth.requireOnboardingComplete` on the server so onboarding users cannot access it.
