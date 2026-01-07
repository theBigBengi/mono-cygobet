# Onboarding Compliance Audit

**Status**: ✅ **COMPLIANT**

This document verifies that the current codebase satisfies all rules defined in `ONBOARDING_CONTRACT.md`.

---

## 1. Server Compliance

### 1.1 Single Source of Truth for onboardingRequired ✅
- **Function**: `isOnboardingRequired(client, userId)`
- **Location**: `apps/server/src/auth/user-onboarding.ts`
- **Behavior**:
  - Loads `users.username` and `userProfiles.onboardingDone`.
  - Returns `true` when:
    - No user found, or
    - No profile or `onboardingDone === false`, or
    - `username` is `null`/empty/whitespace.
- **Conclusion**: All onboarding decisions are centralized in this function.

### 1.2 Profile Existence Guarantee ✅
- **Function**: `ensureUserProfile(client, userId)`
- **Location**: `apps/server/src/auth/user-onboarding.ts`
- **Usage**:
  - `register()` transaction: ensures profile after user creation.
  - `loginWithGoogle()` transaction: ensures profile for both new and existing users.
- **Conclusion**: Every user has a `user_profiles` row created or verified in all creation paths.

### 1.3 /auth/me Returns onboardingRequired ✅
- **Route**: `/auth/me`
- **Location**: `apps/server/src/routes/auth/auth.route.ts`
- **Behavior**:
  - Uses `fastify.userAuth.requireAuth` (auth-only, not blocked by onboarding).
  - Fetches user from `users`.
  - Calls `isOnboardingRequired(prisma, user.id)`.
  - Returns `onboardingRequired` in the response payload.
- **Schema**: `userMeResponseSchema` requires `onboardingRequired: boolean`.
- **Types**: `UserMeResponse` in `packages/types/src/http/auth.ts` includes `onboardingRequired`.

### 1.4 Onboarding Completion Endpoint ✅
- **Route**: `POST /auth/onboarding/complete`
- **Location**: `apps/server/src/routes/auth/auth.route.ts`
- **Service**: `UserOnboardingService.completeOnboarding(userId, username)`
- **Validations**:
  - Username length 3–50.
  - Allowed chars: letters, numbers, underscore, hyphen (regex `^[a-zA-Z0-9_-]+$`).
  - Uniqueness check against `users.username`.
  - User identity sourced from `req.userAuth` (access token), not client input.
- **Transaction**:
  - Updates `users.username`.
  - Calls `completeOnboarding(tx, userId, now)` to set `onboardingDone = true` and `onboardingDoneAt = now`.
- **Conclusion**: Endpoint satisfies contract requirements.

### 1.5 Onboarding Guard on Protected Routes ✅
- **Guard**: `fastify.userAuth.requireOnboardingComplete`
- **Location**: `apps/server/src/plugins/user-auth.ts`
- **Behavior**:
  - Calls `assertAuth()` → returns 401 for guests.
  - Calls `isOnboardingRequired(prisma, ctx.user.id)`.
  - If `true` → throws `ForbiddenError` with:
    - `status = 403`.
    - `code = "ONBOARDING_REQUIRED"`.
- **Application**:
  - Available to be applied to any protected routes that require onboarding.
  - Explicitly **not** used on `/auth/*` and `/auth/onboarding/complete`.
- **Sanity Checks**:
  - Guest + protected route with guard → 401 `UNAUTHORIZED`.
  - Authed + onboardingRequired → 403 `ONBOARDING_REQUIRED`.
  - Authed + onboardingDone → normal success.

---

## 2. Mobile Compliance

### 2.1 Routing Rules ✅
- **Protected Layout**: `apps/mobile/app/(protected)/_layout.tsx`
  - `status === "loading"` → shows loading indicator, no redirect.
  - `status === "guest"` → redirects to `/(auth)/login`.
  - `status === "authed" && user.onboardingRequired` → redirects to `/(onboarding)/username`.
  - `status === "authed" && !user.onboardingRequired` → renders protected `Slot`.
- **Onboarding Layout**: `apps/mobile/app/(onboarding)/_layout.tsx`
  - Only allows access when `status === "authed" && user.onboardingRequired`.
  - If authed + onboardingDone → redirects to `/(protected)/account`.
  - If guest → redirects to `/(auth)/login`.

### 2.2 Onboarding Group Behavior ✅
- **Screen**: `apps/mobile/app/(onboarding)/username.tsx`
- **Behavior**:
  - Renders only when authed + onboardingRequired (enforced by layout).
  - Calls `authApi.completeOnboarding(username)`.
  - On success, calls `bootstrap()` to refresh auth state from server (`/auth/me`).
  - Navigates to `/(protected)/account` after successful completion.

### 2.3 Persistence Behavior ✅
- Onboarding state is not stored separately; it is part of `user.onboardingRequired`.
- On app start / session restore:
  - `bootstrap()` refreshes access token and calls `/auth/me`.
  - `user` (including `onboardingRequired`) is updated from server data.
- If app closes mid-onboarding:
  - Next startup, `/auth/me` still returns `onboardingRequired === true`.
  - Protected layout redirects to onboarding.

---

## 3. API Contract Compliance

### 3.1 /auth/me ✅
- Returns `onboardingRequired` field (verified in route and schema).
- Mobile `UserMeResponse` type includes `onboardingRequired`.

### 3.2 /auth/onboarding/complete ✅
- Validates username format and length.
- Enforces uniqueness.
- Uses authenticated user ID from token.
- Updates username and profile in a single transaction.

---

## 4. Error Handling ✅

### 4.1 403 ONBOARDING_REQUIRED
- **Server**:
  - `requireOnboardingComplete` throws `ForbiddenError` with `code = "ONBOARDING_REQUIRED"`.
- **Client**:
  - `apiFetchWithAuthRetry` checks:
    - `error.status === 403 && error.code === "ONBOARDING_REQUIRED"`.
    - Calls `onboardingRequiredCallback` if set.
    - **Does not** call `logoutCallback` for this error.
- **Conclusion**: 403 onboarding errors route to onboarding flow without logout.

### 4.2 Other Errors
- 401 errors follow auth contract (trigger refresh / logout as defined).
- Network errors preserve tokens and bubble to caller.

---

## 5. Acceptance Criteria ✅

1. **Register → Onboarding**
   - New users have `user_profiles.onboarding_done = false` and `username` enforced by flow.
   - `/auth/me` returns `onboardingRequired === true` until onboarding completion.
   - Protected layout routes authed + onboardingRequired users to onboarding.
2. **App Restart Mid-Onboarding**
   - On restart, `bootstrap()` + `/auth/me` restore `onboardingRequired === true`.
   - Protected layout redirects to onboarding.
3. **Onboarding Completion**
   - `/auth/onboarding/complete` sets username and marks onboarding done.
   - Next `/auth/me` call returns `onboardingRequired === false`.
   - Protected routes no longer redirect to onboarding.
4. **Protected API Calls While Onboarding**
   - Routes using `requireOnboardingComplete` return 403 `ONBOARDING_REQUIRED`.
   - Mobile handles this by routing to onboarding, without logout.
5. **Post-Onboarding Normal Access**
   - Once `onboardingRequired === false`, user behaves like a normal authed user with full protected access.

---

## Conclusion

The onboarding implementation is compliant with `ONBOARDING_CONTRACT.md`:
- Server computes `onboardingRequired` exclusively via `isOnboardingRequired()`.
- Guards enforce onboarding with 403 `ONBOARDING_REQUIRED`.
- Mobile routes correctly based on `status` and `user.onboardingRequired`.
- Auth and token refresh behavior remain unchanged.
