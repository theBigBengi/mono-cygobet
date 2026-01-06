# Admin App Structure Recommendations

## Current Structure Analysis

### ✅ **What's Good:**
- Clear separation of concerns (auth, components, services, pages)
- Domain-specific component folders (countries/, leagues/, etc.)
- Proper use of TypeScript types from `@repo/types`
- Auth system properly isolated in `auth/` folder
- Services layer abstracts API calls

### ⚠️ **Issues Found:**

#### 1. **API Layer Duplication**
- `lib/api.ts` is just a thin wrapper around `lib/adminApi.ts`
- All services use `api.ts` → `adminApi.ts` → `fetch`
- **Recommendation**: Consolidate or make the relationship clearer

#### 2. **Hardcoded Breadcrumb Logic**
- `App.tsx` has nested ternaries for breadcrumb labels (lines 47-63)
- Hard to maintain and extend
- **Recommendation**: Extract to route config or utility

#### 3. **Routes in App.tsx**
- All routes defined inline in `App.tsx`
- Makes the file long and harder to maintain
- **Recommendation**: Extract to `routes/index.tsx` or `config/routes.tsx`

#### 4. **Utils vs Services Overlap**
- `utils/` folder has domain-specific utilities (countries.ts, leagues.ts, etc.)
- These seem to be data transformation utilities
- **Recommendation**: Clarify purpose or merge with services

#### 5. **Missing Barrel Exports**
- Some folders lack `index.ts` for cleaner imports
- **Recommendation**: Add barrel exports where helpful

#### 6. **Auth File Naming**
- `useAdminAuth.tsx` contains both provider and hook
- Already fixed with eslint-disable, but could be split

---

## Recommended Structure Changes

### Option A: Minimal Changes (Recommended)

```
src/
├── auth/
│   ├── index.ts              # Barrel export
│   ├── adminAuth.ts
│   ├── AdminGuard.tsx
│   └── useAdminAuth.tsx
├── components/
│   ├── layout/                # NEW: Layout components
│   │   ├── AdminLayout.tsx    # Extract from App.tsx
│   │   └── AdminHeader.tsx    # Extract header logic
│   └── ... (existing)
├── config/
│   └── routes.tsx             # NEW: Route definitions
├── lib/
│   ├── adminApi.ts            # Keep as main API layer
│   └── api.ts                 # Keep for backward compat (or remove)
├── routes/
│   └── index.tsx              # NEW: Route component
└── utils/
    └── breadcrumbs.ts         # NEW: Breadcrumb mapping
```

### Option B: More Aggressive Refactoring

```
src/
├── api/                       # NEW: All API-related code
│   ├── client.ts             # Rename adminApi.ts
│   ├── errors.ts             # Extract AdminApiError
│   └── index.ts
├── auth/
│   ├── context/              # NEW: Split provider/hook
│   │   ├── AdminAuthContext.tsx
│   │   └── AdminAuthProvider.tsx
│   ├── hooks/
│   │   └── useAdminAuth.ts
│   ├── guards/
│   │   └── AdminGuard.tsx
│   └── services/
│       └── adminAuth.ts
├── features/                  # NEW: Feature-based structure
│   ├── countries/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── ...
└── shared/                    # NEW: Shared utilities
    ├── components/
    ├── hooks/
    └── utils/
```

---

## Specific Recommendations

### 1. Extract Breadcrumb Logic

**Create:** `src/utils/breadcrumbs.ts`
```typescript
export const ROUTE_LABELS: Record<string, string> = {
  "/": "Sync Center",
  "/sync-center": "Sync Center",
  "/countries": "Countries",
  "/leagues": "Leagues",
  "/teams": "Teams",
  "/seasons": "Seasons",
  "/bookmakers": "Bookmakers",
  "/odds": "Odds",
  "/fixtures": "Fixtures",
  "/jobs": "Jobs",
};

export function getRouteLabel(pathname: string): string {
  return ROUTE_LABELS[pathname] ?? "Admin";
}
```

### 2. Extract Routes

**Create:** `src/config/routes.tsx`
```typescript
import { RouteObject } from "react-router-dom";
import { AdminGuard } from "@/auth/AdminGuard";
import { AdminLayout } from "@/components/layout/AdminLayout";
// ... imports

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { path: "/", element: <SyncCenterPage /> },
      { path: "/sync-center", element: <SyncCenterPage /> },
      // ... rest
    ],
  },
];
```

### 3. Simplify API Layer

**Option 1:** Remove `lib/api.ts`, use `adminApi.ts` directly
**Option 2:** Keep `api.ts` but add JSDoc explaining it's a convenience wrapper

### 4. Add Barrel Exports

**Create:** `src/auth/index.ts`
```typescript
export { AdminAuthProvider, useAdminAuth } from "./useAdminAuth";
export { AdminGuard } from "./AdminGuard";
export * from "./adminAuth";
```

**Create:** `src/lib/index.ts`
```typescript
export { adminFetch, AdminApiError } from "./adminApi";
export { apiGet, apiPost, apiPatch } from "./api";
export * from "./utils";
```

### 5. Extract Layout Components

**Create:** `src/components/layout/AdminLayout.tsx`
- Move `AdminLayout` from `App.tsx`
- Extract header to `AdminHeader.tsx`

---

## Priority Actions

### High Priority:
1. ✅ Extract breadcrumb logic (5 min)
2. ✅ Extract routes config (10 min)
3. ✅ Add barrel exports for auth (2 min)

### Medium Priority:
4. Extract layout components (15 min)
5. Document API layer relationship (5 min)

### Low Priority:
6. Consider feature-based structure (if app grows)
7. Consolidate utils/services if they overlap

---

## Implementation Order

1. **Quick wins first:**
   - Add `auth/index.ts` barrel export
   - Extract breadcrumb utility
   - Extract routes config

2. **Then refactor:**
   - Extract layout components
   - Clean up App.tsx

3. **Finally optimize:**
   - Review utils/services overlap
   - Consider feature-based structure if needed

