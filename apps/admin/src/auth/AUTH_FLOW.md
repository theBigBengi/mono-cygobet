# Admin Authentication Flow

## Overview

The admin app uses **cookie-based authentication** with httpOnly cookies for security. All authentication state is managed through React Context and protected routes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Layers                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. API Layer (adminAuth.ts)                                  │
│     - Low-level API calls to /admin/auth/*                   │
│     - Uses adminFetch with credentials: "include"            │
│                                                               │
│  2. State Layer (useAdminAuth.tsx)                           │
│     - React Context for global auth state                    │
│     - Status machine: idle → loading → authed/guest          │
│     - Actions: bootstrap, login, logout                      │
│                                                               │
│  3. Guard Layer (AdminGuard.tsx)                             │
│     - Route protection based on auth status                  │
│     - Redirects guests to /login                             │
│                                                               │
│  4. UI Layer (LoginPage.tsx)                                 │
│     - Login form                                              │
│     - Handles login flow and error display                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. App Startup (Bootstrap)

```
User opens app
    ↓
App.tsx mounts
    ↓
useEffect calls bootstrap()
    ↓
bootstrap() → GET /admin/auth/me
    ↓
    ├─ Cookie valid? → status: "authed", me: userData
    └─ No/invalid cookie? → status: "guest", me: null
```

**Files:**
- `App.tsx` - Calls bootstrap on mount
- `useAdminAuth.tsx` - bootstrap() function

### 2. Login Flow

```
User enters credentials
    ↓
LoginPage submits form
    ↓
login() → POST /admin/auth/login
    ↓
Server validates credentials
    ↓
    ├─ Valid? → Server sets httpOnly cookie
    │            ↓
    │         bootstrap() → GET /admin/auth/me
    │            ↓
    │         status: "authed", me: userData
    │            ↓
    │         Redirect to protected route
    │
    └─ Invalid? → 401 error
                  ↓
               Show "Invalid credentials"
```

**Files:**
- `pages/login.tsx` - Login form UI
- `useAdminAuth.tsx` - login() function
- `adminAuth.ts` - login() API call

### 3. Protected Route Access

```
User navigates to protected route
    ↓
AdminGuard checks status
    ↓
    ├─ status: "loading" → Show loading spinner
    ├─ status: "guest" → Redirect to /login
    └─ status: "authed" → Render protected content
```

**Files:**
- `config/routes.tsx` - Route definitions with AdminGuard
- `AdminGuard.tsx` - Route protection logic

### 4. Logout Flow

```
User clicks logout
    ↓
logout() → POST /admin/auth/logout
    ↓
Server clears cookie
    ↓
Local state cleared: status: "guest", me: null
    ↓
Redirect to /login (via AdminGuard)
```

**Files:**
- `useAdminAuth.tsx` - logout() function
- `adminAuth.ts` - logout() API call
- `components/layout/AdminHeader.tsx` - Logout button

## State Machine

```
┌──────┐
│ idle │  ← Initial state
└──┬───┘
   │
   │ bootstrap() called
   ↓
┌─────────┐
│ loading │  ← Checking auth status
└──┬──────┘
   │
   ├─ Valid cookie → ┌────────┐
   │                 │ authed │  ← Authenticated
   │                 └───┬────┘
   │                     │
   │                     │ logout() → ┌───────┐
   │                     └───────────→│ guest │
   │                                  └───────┘
   │
   └─ No/invalid cookie → ┌───────┐
                          │ guest │  ← Not authenticated
                          └───┬───┘
                              │
                              │ login() → ┌─────────┐
                              │           │ loading │
                              └──────────→└─────────┘
```

## Cookie Configuration

### Production
- `sameSite: "none"` - Required for cross-origin (frontend/backend on different domains)
- `secure: true` - Required when sameSite="none" (HTTPS only)
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `path: "/"` - Available for all routes

### Development
- `sameSite: "none"` - Same as production for consistency
- `secure: true` - Same as production
- `httpOnly: true` - Same as production

## API Endpoints

### POST /admin/auth/login
- **Input:** `{ email: string, password: string }`
- **Output:** `{ status: "success", message: string }`
- **Side Effect:** Sets httpOnly cookie `admin_session`
- **Errors:** 401 (Invalid credentials)

### GET /admin/auth/me
- **Input:** None (uses cookie)
- **Output:** `{ status: "success", data: { id, email, role, name } }`
- **Errors:** 401 (Not authenticated), 403 (Forbidden)

### POST /admin/auth/logout
- **Input:** None (uses cookie)
- **Output:** `{ status: "success", message: string }`
- **Side Effect:** Clears httpOnly cookie

## File Structure

```
src/auth/
├── adminAuth.ts          # Low-level API functions
├── useAdminAuth.tsx      # React Context & hook
├── AdminGuard.tsx        # Route protection component
├── index.ts             # Barrel export
└── AUTH_FLOW.md         # This file

src/pages/
└── login.tsx            # Login page component

src/components/layout/
└── AdminHeader.tsx      # Header with logout button
```

## Usage Examples

### Using auth state in components

```tsx
import { useAdminAuth } from "@/auth";

function MyComponent() {
  const { status, me, login, logout } = useAdminAuth();

  if (status === "loading") return <Spinner />;
  if (status === "guest") return <LoginPrompt />;

  return (
    <div>
      <p>Hello {me?.name}</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

### Protecting a route

```tsx
// In config/routes.tsx
{
  element: (
    <AdminGuard>
      <MyProtectedComponent />
    </AdminGuard>
  ),
  children: [
    { path: "/dashboard", element: <Dashboard /> }
  ]
}
```

### Manual login

```tsx
const { login } = useAdminAuth();

try {
  await login("admin@example.com", "password123");
  // User is now authenticated
} catch (error) {
  // Handle login error
}
```

## Security Considerations

1. **httpOnly Cookies**: Tokens stored in httpOnly cookies cannot be accessed by JavaScript, preventing XSS attacks.

2. **SameSite Policy**: 
   - Production uses `sameSite: "none"` for cross-origin support
   - Requires `secure: true` (HTTPS only)

3. **CORS Configuration**: 
   - Backend must allow credentials: `credentials: true`
   - Origin must be exact (not wildcard)

4. **Session Expiry**: 
   - Sessions expire after 24 hours
   - Expired sessions are cleaned up on access

5. **No Token Storage**: 
   - No tokens stored in localStorage
   - All auth state comes from cookie validation

## Troubleshooting

### "401 Unauthorized" after login
- Check cookie settings (sameSite, secure)
- Verify CORS allows credentials
- Check backend cookie configuration

### Cookie not being sent
- Verify `credentials: "include"` in fetch calls
- Check browser console for cookie warnings
- Ensure sameSite/secure settings match environment

### Redirect loop
- Check AdminGuard logic
- Verify bootstrap completes before route render
- Check for conflicting auth checks

