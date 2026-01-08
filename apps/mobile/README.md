# Mobile App - Expo Router

A React Native mobile application built with Expo Router, featuring a centralized UI system, authentication, and sports betting fixtures management.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [UI System](#ui-system)
- [Features](#features)
- [Getting Started](#getting-started)
- [Development](#development)
- [Architecture](#architecture)
- [Key Concepts](#key-concepts)

## 🎯 Overview

This mobile app is part of a monorepo structure and provides:

- **Public & Protected Routes**: Guest and authenticated user experiences
- **Authentication**: Login, registration, and secure token management
- **Onboarding**: User onboarding flow for new accounts
- **Fixtures Display**: Sports fixtures with odds
- **Picks System**: User selection of picks (1/X/2) with Jotai state management
- **Consistent UI**: Centralized design system with theme tokens and reusable components

## 🛠 Tech Stack

- **Framework**: Expo ~54.0.31 with Expo Router ~6.0.21
- **Language**: TypeScript
- **State Management**:
  - Jotai (for picks and app start state)
  - React Query (for server state)
- **HTTP Client**: Axios with custom API client
- **Storage**: Expo Secure Store (for auth tokens)
- **Navigation**: Expo Router (file-based routing)
- **UI**: React Native with custom design system

## 📁 Project Structure

```
apps/mobile/
├── app/                      # Expo Router routes (file-based routing)
│   ├── _layout.tsx          # Root layout with providers
│   ├── (public)/            # Public routes (no auth required)
│   │   ├── _layout.tsx
│   │   └── index.tsx        # Public home screen
│   ├── (auth)/              # Authentication routes
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (onboarding)/        # Onboarding flow
│   │   ├── _layout.tsx
│   │   └── username.tsx
│   └── (protected)/         # Protected routes (auth required)
│       ├── _layout.tsx
│       ├── index.tsx        # Protected home screen
│       └── profile.tsx
│
├── components/              # Reusable components
│   ├── ui/                  # Base UI components (Screen, Button, Card, etc.)
│   ├── AppStart/            # App initialization gate
│   ├── Picks/               # Betting picks components
│   └── QueryState/          # Loading/error state components
│
├── features/                # Feature modules
│   ├── fixtures/            # Fixtures feature
│   │   ├── components/     # FixtureCard, FixtureCardRow
│   │   ├── fixtures.api.ts # API calls
│   │   ├── fixtures.queries.ts # React Query hooks
│   │   └── fixtures.ui.ts  # Presentation utilities
│   ├── picks/               # Betting picks feature
│   │   ├── picks.store.ts  # Jotai atoms
│   │   ├── picks.hooks.ts  # React hooks
│   │   └── picks.types.ts  # TypeScript types
│   └── profile/             # User profile feature
│
├── lib/                     # Core libraries
│   ├── auth/                # Authentication logic
│   │   ├── AuthProvider.tsx # Auth context provider
│   │   ├── auth.api.ts      # Auth API calls
│   │   └── auth.storage.ts  # Token storage
│   ├── appStart/            # App initialization
│   │   ├── appStart.run.ts  # Bootstrap orchestrator
│   │   ├── appStart.prefetch.ts # Data prefetching
│   │   └── appStart.state.ts # Jotai state
│   ├── http/                # HTTP client
│   │   ├── apiClient.ts     # Axios wrapper
│   │   └── apiError.ts      # Error handling
│   └── query/               # React Query setup
│
└── lib/
    └── theme/               # Design tokens + theme provider
        ├── colors.ts        # Light/Dark color palettes
        ├── spacing.ts       # Spacing scale
        ├── typography.ts    # Text styles
        ├── radius.ts        # Border radius values
        ├── theme.resolver.ts# Resolves active theme (system/light/dark)
        └── ThemeProvider.tsx# Theme provider + useTheme()
```

## 🎨 UI System

The app uses a centralized design system to ensure consistency across all screens with full support for Light and Dark mode.

### Theme System (`lib/theme/`)

The theme system is located in `lib/theme/` and provides:

- **Light/Dark Mode**: Automatic adaptation to system color scheme
- **Theme Provider**: React context for theme access throughout the app
- **Pure Tokens**: No React, hooks, or platform APIs in token files

#### Colors (`lib/theme/colors.ts`)

Defines color palettes for both light and dark themes:

- **Light Theme**:
  - Background: `background` (white), `surface` (light gray)
  - Text: `textPrimary` (black), `textSecondary` (gray)
  - Interactive: `primary` (blue), `danger` (red)
  - Structural: `border` (light gray)
- **Dark Theme**:
  - Background: `background` (black), `surface` (dark gray)
  - Text: `textPrimary` (white), `textSecondary` (light gray)
  - Interactive: `primary` (lighter blue), `danger` (lighter red)
  - Structural: `border` (dark gray)

#### Spacing (`lib/theme/spacing.ts`)

Scale: `xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`

#### Typography (`lib/theme/typography.ts`)

Four variants: `title`, `subtitle`, `body`, `caption` with consistent sizing and weights

#### Radius (`lib/theme/radius.ts`)

Border radius: `sm: 8px`, `md: 12px`, `lg: 16px`

#### Theme Resolution (`lib/theme/theme.resolver.ts`)

- Resolves active color scheme based on system preference
- Maps theme mode ("system" | "light" | "dark") to active colors
- Returns complete theme object with all tokens

#### Theme Provider (`lib/theme/ThemeProvider.tsx`)

- Provides `useTheme()` hook for accessing theme
- Manages theme mode state internally (default: "system")
- Supports three modes: "system" | "light" | "dark"
- Automatically adapts to system color scheme changes when mode is "system"
- Exposes `setMode()` function for manual theme switching (memory-only, no persistence)
- Wraps the entire app at root layout level

**Theme Mode Policy:**
- **"system"** (default): Follows device color scheme, automatically updates when OS changes
- **"light"**: Forces light theme regardless of system setting
- **"dark"**: Forces dark theme regardless of system setting
- Mode is controlled by `ThemeProvider` (infrastructure-level state)
- Persistence is intentionally not implemented yet (mode resets on app reload)
- Future: Settings screen will allow users to switch mode and persist preference

### UI Components (`components/ui/`)

Reusable components that enforce the design system:

- **`Screen`**: Screen wrapper with SafeAreaView and optional scrolling
- **`AppText`**: Typography component with variant and color props
- **`Button`**: Pressable button with primary/secondary/danger variants
- **`Card`**: Container for grouped content with consistent styling
- **`Row`**: Horizontal layout primitive
- **`Stack`**: Vertical layout primitive
- **`Divider`**: Simple divider line

### Design Principles

1. **No Inline Styles**: Screens must use components or shared styles
2. **No Hardcoded Values**: All colors, spacing, and sizes come from theme tokens
3. **No Direct Theme Imports in Screens**: Screens must use UI components, never import theme directly
4. **Theme-Aware Components**: All UI components use `useTheme()` hook, never read system color scheme directly
5. **Component Composition**: Build screens from reusable components
6. **Single Source of Truth**: All design decisions live in theme and components
7. **Presentation Only**: UI components contain no business logic
8. **Automatic Dark Mode**: UI automatically adapts to system color scheme changes

### Usage Example

```tsx
import { Screen, AppText, Button, Card } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";

export default function ExampleScreen() {
  // Screens never import theme directly
  // UI components handle theme internally via useTheme()
  return (
    <Screen scroll>
      <AppText variant="title" style={sharedStyles.titleMargin}>
        Screen Title
      </AppText>

      <Card style={sharedStyles.cardMargin}>
        <AppText variant="subtitle">Card Title</AppText>
        <AppText variant="body" color="secondary">
          Card content
        </AppText>
      </Card>

      <Button
        label="Action"
        onPress={handleAction}
        style={sharedStyles.buttonContainer}
      />
    </Screen>
  );
}
```

### Theme Access

**For UI Components** (inside `components/ui/`):

```tsx
import { useTheme } from "@/lib/theme";

export function MyComponent() {
  const { theme, colorScheme, mode, setMode } = useTheme();
  // Access theme.colors, theme.spacing, theme.typography, theme.radius
  // Access colorScheme for current scheme ("light" | "dark")
  // Access mode for current mode ("system" | "light" | "dark")
  // Use setMode("light" | "dark" | "system") to switch theme mode
}
```

**For Screens**: Never import theme directly. Use UI components that handle theme internally. Screens should not manage theme state - theme mode is infrastructure-level.

## ✨ Features

### Authentication

- **Login/Register**: Email or username authentication
- **Token Management**: Secure storage with automatic refresh
- **Protected Routes**: Route guards based on auth status
- **Onboarding Flow**: New user onboarding with username setup

### Fixtures

- **Public Fixtures**: Upcoming fixtures visible to all users
- **Protected Fixtures**: Authenticated user-specific fixtures
- **Fixture Cards**: Consistent card layout with team info, date/time, and odds
- **Odds Display**: 1/X/2 odds with visual selection

### Picks System

- **Selection**: Users can select one pick per fixture (1, X, or 2)
- **State Management**: Jotai atoms for picks state
- **Floating Submit**: Submit button appears when picks are selected
- **Visual Feedback**: Selected picks are highlighted in blue

### App Initialization

- **Single Loading Gate**: App shows one loading screen during startup
- **Bootstrap**: Auth initialization runs once on app start
- **Prefetch**: Initial data is prefetched based on auth status
- **Error Handling**: Network errors show retry UI without logging out

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)
- Expo CLI (optional, included in dependencies)

### Installation

From the monorepo root:

```bash
pnpm install
```

### Running the App

From `apps/mobile/`:

```bash
# Start Expo development server
pnpm start

# Or use npm
npm start
```

Then:

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web browser
- Scan QR code with Expo Go app (for physical devices)

### Building

```bash
# Preview builds (internal testing)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production builds (stores)
eas build --profile production --platform android
eas build --profile production --platform ios
```

## 💻 Development

### Scripts

- `pnpm start`: Start Expo development server
- `pnpm android`: Start with Android emulator
- `pnpm ios`: Start with iOS simulator
- `pnpm web`: Start web version
- `pnpm lint`: Run ESLint

### Code Style

- **TypeScript**: Strict mode enabled
- **No Inline Styles**: Use components or `sharedStyles`
- **No Hardcoded Values**: Use theme tokens
- **Component-Based**: Build with reusable UI components

### File Naming

- **Components**: PascalCase (e.g., `FixtureCard.tsx`)
- **Utilities**: camelCase (e.g., `fixtures.ui.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Types**: camelCase with `.types.ts` suffix (e.g., `picks.types.ts`)

## 🏗 Architecture

### Route Groups

Expo Router uses file-based routing with route groups:

- **`(public)`**: Routes accessible to all users
- **`(auth)`**: Login and registration screens
- **`(onboarding)`**: Onboarding flow for new users
- **`(protected)`**: Routes requiring authentication and completed onboarding

### State Management

- **Jotai**: Client-side state (picks, app start status)
- **React Query**: Server state (fixtures, profile, API data)
- **Context API**: Auth state via `AuthProvider`

### Data Fetching

- **React Query**: All API calls use React Query hooks
- **Prefetching**: Initial data prefetched during app start
- **Caching**: React Query handles caching and refetching
- **Error Handling**: Centralized error handling with retry logic

#### Contract (feature ownership and query keys)

- Each feature owns its data layer with files:
  - `*.api.ts` (network calls)
  - `*.keys.ts` (query keys; include only real server inputs)
  - `*.queries.ts` (hooks wrapping queries)
  - `*.mutations.ts` (hooks wrapping mutations)
- Screens can only call hooks from `*.queries.ts` / `*.mutations.ts` (no direct API calls).
- Protected queries must be enabled only when `isReadyForProtected(status, user)` is true.
- On explicit logout, clear user-scoped React Query cache.

### API Client

- **Axios**: HTTP client with interceptors
- **Auth Retry**: Automatic token refresh on 401 errors
- **Error Types**: Typed error handling (`ApiError`, `NetworkError`, etc.)

### Environment

- `EXPO_PUBLIC_API_BASE_URL`:
  - Set in EAS environment variables for preview/production builds.
  - Used by `getApiBaseUrl()` in the HTTP client to construct endpoints.
  - Local development: falls back to a sensible default if not provided.

## 🔑 Key Concepts

### App Start Flow

1. **App Launch**: `AppStartGate` shows loading screen
2. **Bootstrap**: Auth initialization (check for refresh token, refresh if exists)
3. **Prefetch**: Based on auth status:
   - Guest → Prefetch public fixtures
   - Authed + Onboarding → Skip prefetch, route to onboarding
   - Authed + Onboarded → Prefetch protected fixtures
4. **Ready**: App shows appropriate route based on auth state

### Authentication Flow

1. **Login/Register**: User authenticates, receives tokens
2. **Token Storage**: Refresh token stored in Expo Secure Store
3. **Auto Refresh**: Access token refreshed automatically on API calls
4. **Logout**: Tokens cleared, user redirected to public routes

### Picks System

1. **Selection**: User taps odds button (1/X/2) on fixture card
2. **State Update**: Jotai atom updates with fixture ID and pick
3. **Visual Feedback**: Selected button highlighted in blue
4. **Submit**: Floating button appears, logs picks on press

### Fixture Cards

- **Layout**: Header row (teams + date/time) + Odds row (1/X/2 buttons)
- **Team Display**: Home team (name + logo), Away team (logo + name)
- **Odds**: Three equal-width buttons showing odds values
- **Selection**: Integrated pick selection with visual feedback

## 📚 Additional Documentation

- **`AUTH_CONTRACT.md`**: Authentication contract and behavior
- **`AUTH_IMPLEMENTATION.md`**: Auth implementation details
- **`DATA_FETCHING_CONTRACT.md`**: Data fetching patterns and contracts
- **`ONBOARDING_CONTRACT.md`**: Onboarding flow contract

## 🤝 Contributing

When adding new features:

1. **Use UI System**: Always use components from `components/ui/`
2. **Follow Theme**: Use theme tokens, never hardcode values
3. **Feature Modules**: Organize features in `features/` directory
4. **Type Safety**: Use TypeScript types from `@repo/types` when available
5. **No Inline Styles**: Use `sharedStyles` or component props

### Folder Structure Rules

- Generic, reusable UI primitives live in `components/ui/`.
- Feature-specific components live inside their feature (e.g., `features/fixtures/components/`).
- Query state UI (loading/error) is presentation-only and may live under `components/ui/QueryState/` (recommended) to follow the same UI rules.

### Theme Mode Policy

- Theme mode: `"system"` | `"light"` | `"dark"`.
- Current default: `"system"` (follows device setting).
- Future: settings screen will allow manual override and persistence.

### Inline Styles Rule Clarification

- Inline objects are forbidden in screens: `style={{ ... }}` is not allowed.
- Using shared StyleSheet references is allowed: `style={sharedStyles.foo}`.

## 📝 License

Private project - All rights reserved
