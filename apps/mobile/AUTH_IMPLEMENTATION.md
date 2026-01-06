# User Authentication Implementation - Mobile App

## Summary

Implemented a production-grade authentication foundation for the Expo mobile app with:
- Secure token storage using `expo-secure-store`
- JWT access tokens (in-memory) + refresh tokens (SecureStore)
- Automatic token refresh on 401 errors
- Route protection with Expo Router
- Complete auth flow: login, logout, bootstrap, refresh

## Files Created/Modified

### Created Files

**Environment & HTTP Client:**
- `lib/env.ts` - API base URL configuration
- `lib/http/apiError.ts` - Typed API error class
- `lib/http/apiClient.ts` - HTTP client with automatic token refresh

**Authentication Core:**
- `lib/auth/auth.types.ts` - TypeScript types for auth state
- `lib/auth/auth.storage.ts` - Secure token storage (expo-secure-store)
- `lib/auth/auth.api.ts` - API functions for auth endpoints
- `lib/auth/AuthProvider.tsx` - React Context provider for auth state
- `lib/auth/useAuth.ts` - Hook to access auth context

**Screens:**
- `app/(public)/index.tsx` - Public welcome screen
- `app/(auth)/login.tsx` - Login screen
- `app/(protected)/_layout.tsx` - Protected route guard
- `app/(protected)/account.tsx` - Protected account screen

### Modified Files

- `app/_layout.tsx` - Wrapped with AuthProvider
- `package.json` - Added `expo-secure-store` and `@repo/types` dependencies
- `packages/types/package.json` - Added `./http/auth` export path

## Architecture

### Token Strategy
- **Access Token**: Stored in React state (memory only), short-lived (15 min)
- **Refresh Token**: Stored in `expo-secure-store`, long-lived (30 days)
- **Rotation**: Refresh tokens rotate on every refresh call

### Auth Flow

1. **Bootstrap (App Start)**:
   - Check for refresh token in SecureStore
   - If exists: refresh access token → fetch user data → set authed
   - If not: set guest status

2. **Login**:
   - Call `/auth/login`
   - Store refresh token in SecureStore
   - Set access token in memory
   - Fetch user data from `/auth/me`
   - Set authed status

3. **Automatic Refresh (on 401)**:
   - API client detects 401 error
   - Calls refresh callback from AuthProvider
   - Retries original request with new access token
   - If refresh fails: logout automatically

4. **Logout**:
   - Call `/auth/logout` (best-effort)
   - Clear refresh token from SecureStore
   - Clear access token and user from state
   - Set guest status

### Route Protection

- `(protected)/_layout.tsx` checks auth status:
  - `loading` → Show loading spinner
  - `guest` → Redirect to `/(auth)/login`
  - `authed` → Render protected routes

## Manual Test Steps

### Prerequisites

1. **Install dependencies**:
   ```bash
   cd apps/mobile
   pnpm install
   ```

2. **Set environment variable**:
   Create `.env` file or set:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
   ```
   For production:
   ```
   EXPO_PUBLIC_API_BASE_URL=https://mono-cygobet.onrender.com
   ```

3. **Ensure server is running** on port 4000 with user auth endpoints available:
   ```bash
   cd apps/server
   pnpm dev
   ```

4. **Clear Metro cache if you see asset errors**:
   ```bash
   cd apps/mobile
   pnpm start --clear
   ```

### iOS Simulator

1. **Start Expo**:
   ```bash
   pnpm start
   # Press 'i' for iOS simulator
   ```

2. **Test Public Screen**:
   - App opens to `/(public)/index.tsx`
   - Tap "Go to Account" → Should redirect to login

3. **Test Login**:
   - Enter email/username and password
   - On success → Redirects to account screen
   - Verify user data displays correctly

4. **Test Account Screen**:
   - Verify all user fields display (id, email, username, name, role)
   - Tap "Logout" → Should return to public screen

5. **Test Token Refresh**:
   - Login successfully
   - Wait 15+ minutes (or manually expire token)
   - Navigate to account screen
   - Should automatically refresh token and work

6. **Test Bootstrap**:
   - Login successfully
   - Close app completely
   - Reopen app
   - Should automatically restore session (refresh token → access token → user data)

### Android Emulator

1. **Start Expo**:
   ```bash
   pnpm start
   # Press 'a' for Android emulator
   ```

2. **Follow same test steps as iOS**

### Edge Cases to Test

1. **Invalid Credentials**:
   - Try login with wrong password
   - Should show error message

2. **Network Error**:
   - Turn off network
   - Try login
   - Should show appropriate error

3. **Expired Refresh Token**:
   - Clear app data or wait 30 days
   - Try to access protected route
   - Should redirect to login

4. **Concurrent Requests**:
   - Make multiple API calls simultaneously
   - Token refresh should only happen once

## TODOs / Future Enhancements

1. **Google OAuth UI**:
   - Implement Google Sign-In button in login screen
   - Integrate with `auth.api.google()` function
   - Handle Google ID token flow

2. **UI Polish**:
   - Add loading states for all async operations
   - Improve error message display
   - Add form validation
   - Add password visibility toggle
   - Add "Remember me" option (if needed)

3. **Additional Features**:
   - Registration screen (stub exists in `auth.api.register()`)
   - Password reset flow
   - Email verification flow
   - Profile editing

4. **Error Handling**:
   - Add retry logic for network failures
   - Add offline mode detection
   - Better error messages for different error types

5. **Security**:
   - Add biometric authentication option
   - Add session timeout warnings
   - Add device fingerprinting (optional)

## API Endpoints Used

- `POST /auth/login` - Login with credentials
- `POST /auth/register` - Register new user (stub)
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user data
- `POST /auth/google` - Google OAuth login (stub)
- `POST /auth/logout` - Logout and revoke refresh token

## Environment Variables

Required:
- `EXPO_PUBLIC_API_BASE_URL` - Base URL for API server

Example:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Dependencies Added

- `expo-secure-store@~14.0.8` - Secure token storage
- `@repo/types` - Shared TypeScript types (workspace package)

## Notes

- All authentication uses `Authorization: Bearer <accessToken>` header
- No cookies are used (mobile-friendly)
- Refresh tokens are automatically rotated on each refresh
- Automatic logout on refresh failure prevents infinite loops
- Type-safe throughout (no `any` types)

