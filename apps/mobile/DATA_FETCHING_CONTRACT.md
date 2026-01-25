# Data Fetching Contract (Mobile)

Authoritative rules for server data access in `apps/mobile`.

---

## 1. No network calls in screens/components

- Screens and UI components **MUST NOT** call `apiFetch`, `apiFetchWithAuthRetry`, or `fetch` directly.
- All server calls **MUST** go through:
  - Feature API modules (e.g. `features/profile/profile.api.ts`).
  - React Query hooks (e.g. `features/profile/profile.queries.ts`, `features/profile/profile.mutations.ts`).

---

## 2. React Query is the source of truth for server data

- Server data **MUST NOT** be stored in context or custom global state.
- Only **auth state/tokens** belong in `AuthProvider`.
- All other server data **MUST** come from React Query caches.

---

## 3. Types from `@repo/types`

- Shared HTTP response shapes **MUST** be defined/exported in `packages/types` (e.g. `@repo/types/http/*`).
- Feature-local `*.types.ts` are allowed **only** for UI view models/derived shapes, not raw API payloads.

---

## 4. Query keys

- **NO inline string keys** in hooks.
- Each feature **MUST** define a `*.keys.ts` module.
  - Example: `features/profile/profile.keys.ts`.
- Keys **MUST** be array/tuple-based (`["profile", "me"] as const`) and exported from the keys module.
- **Query keys MUST reflect ONLY real request inputs** (no unused params).
  - Example: If a protected endpoint doesn't use `days`, the protected query key must NOT include `days`.
  - This prevents unnecessary cache fragmentation and ensures keys accurately represent the request.
  - **Rule**: Query keys only include real request inputs that are actually sent to the server.

---

## 5. Auth-aware data fetching

- Protected queries **MUST** be disabled unless:
  - `status === "authed"` **AND**
  - `user` exists **AND**
  - For onboarding-gated domains: `user.onboardingRequired === false`.
- Queries **MUST NOT** fire repeatedly during bootstrap or when they are guaranteed to fail.

---

## 6. Error handling policy

- `NO_ACCESS_TOKEN`:
  - **MUST NOT** trigger refresh or logout.
  - **MUST NOT** auto-retry.
- `ONBOARDING_REQUIRED` (403):
  - **MUST NOT** trigger logout.
  - **MUST** result in routing to onboarding via existing global callback/layout (not per-screen navigation).
- Network errors (`status === 0`):
  - **MUST** preserve tokens.
  - **MAY** be retried with bounded retry (handled in QueryClient defaults).
- 401 errors:
  - Already handled by `apiFetchWithAuthRetry` (single refresh + retry).
  - Hooks/screens **MUST NOT** add extra retry loops for 401.

---

## 7. Routing & Endpoint Usage

- Public main screen:
  - **MUST NOT** call protected endpoints.
  - May navigate to login and (optionally) to protected routes based on auth state.
- Protected routes:
  - **MUST NOT** call `/auth/me` directly (owned by `AuthProvider/bootstrap`).
- Profile screen:
  - **MUST** use `/api/users/profile` for domain data via its feature query hook.
  - **MUST NOT** call `/auth/me`.
  - `ONBOARDING_REQUIRED` errors **MUST NOT** cause logout.

---

## 8. Adding a New Endpoint (Checklist)

For every new server endpoint used by the mobile app:

1. **Add/Update Types**
   - Define response shape in `packages/types` and export via `@repo/types`.

2. **Feature API Module**
   - Create/extend `features/<feature>/<feature>.api.ts`.
   - Add a function that calls the endpoint using `apiFetch`/`apiFetchWithAuthRetry`.

3. **Keys Module**
   - Add a key in `features/<feature>/<feature>.keys.ts`.

4. **Query/Mutation Hook**
   - Add `useXxxQuery` / `useXxxMutation` in `features/<feature>/<feature>.queries.ts` / `*.mutations.ts`.
   - Use the keys module for `queryKey`/`invalidateQueries`.
   - Make queries auth-aware (enabled flag).

5. **Screen Integration**
   - Screens **MUST** use hooks only.
   - **NO** direct API or HTTP calls from screens/components.

---

## 9. Feature Template Checklist

For every new feature under `apps/mobile/features/<feature>`:

- **Required files:**
  - `features/<feature>/<feature>.api.ts`
  - `features/<feature>/<feature>.keys.ts`
  - `features/<feature>/<feature>.queries.ts`
  - `features/<feature>/<feature>.mutations.ts`
  - `features/<feature>/screens/*` (Expo Router screens or screen components)
- **Prohibitions:**
  - **NO** network calls in screens.
  - Screens **MUST** use the feature’s hooks only.

---

## 10. Date Handling

- Server responses **SHOULD** transport timestamps as ISO strings (per `@repo/types`).
- If UI needs `Date` objects:
  - Convert in React Query using `select` inside `useXxxQuery`.
  - **Do not** perform string-to-Date conversion inside components.

---

## 11. Query String Encoding for Arrays

- **Arrays MUST be encoded as repeated keys** (not comma-separated strings).
  - Example: `leagues=[1,2]` → `leagues=1&leagues=2` (NOT `leagues=1,2` or `leagues=[1,2]`).
- This ensures proper server-side parsing and prevents ambiguity.
- Use `URLSearchParams.append()` for arrays, `URLSearchParams.set()` for scalars.
- **Rule**: Arrays must be encoded via repeated keys in the query string.

## 12. Fixtures Feature Example

- **Fixtures** (`GET /api/fixtures/upcoming`):
  - **MUST** use `apiFetchWithAuthRetry` and the fixtures endpoint.
  - **MUST** fetch via `useUpcomingFixturesQuery` and be enabled only when `isReadyForProtected(status, user)` is true.
  - **MUST** set `meta: { scope: "user" }` so logout can clear user fixtures cache.
  - Supports full filter set (from/to, leagues, markets, include, etc.) when needed.

This contract is authoritative for future data fetching behavior in `apps/mobile`. Any deviation is a bug.
