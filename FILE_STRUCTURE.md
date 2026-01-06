# Mono-Cygobet File Structure

```
mono-cygobet/
├── apps/
│   ├── admin/                          # Admin dashboard (React + Vite)
│   │   ├── src/
│   │   │   ├── auth/                   # Admin authentication
│   │   │   │   ├── adminAuth.ts
│   │   │   │   ├── AdminGuard.tsx
│   │   │   │   ├── AUTH_FLOW.md
│   │   │   │   ├── index.ts
│   │   │   │   └── useAdminAuth.tsx
│   │   │   ├── components/             # React components
│   │   │   │   ├── app-sidebar.tsx
│   │   │   │   ├── bookmakers/
│   │   │   │   ├── countries/
│   │   │   │   ├── error-boundary.tsx
│   │   │   │   ├── filters/
│   │   │   │   ├── fixtures/
│   │   │   │   ├── layout/
│   │   │   │   ├── leagues/
│   │   │   │   ├── odds/
│   │   │   │   ├── search-form.tsx
│   │   │   │   ├── seasons/
│   │   │   │   ├── settings/
│   │   │   │   ├── table/
│   │   │   │   ├── teams/
│   │   │   │   ├── ui/                 # UI components (shadcn/ui)
│   │   │   │   └── version-switcher.tsx
│   │   │   ├── hooks/                  # React hooks
│   │   │   │   ├── use-batches.ts
│   │   │   │   ├── use-bookmakers.ts
│   │   │   │   ├── use-countries.ts
│   │   │   │   ├── use-fixtures.ts
│   │   │   │   ├── use-jobs.ts
│   │   │   │   ├── use-leagues.ts
│   │   │   │   ├── use-markets.ts
│   │   │   │   ├── use-odds.ts
│   │   │   │   ├── use-seasons.ts
│   │   │   │   └── use-teams.ts
│   │   │   ├── lib/                    # Utilities
│   │   │   │   ├── adminApi.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── utils.ts
│   │   │   ├── pages/                   # Page components
│   │   │   │   ├── bookmakers.tsx
│   │   │   │   ├── countries.tsx
│   │   │   │   ├── fixtures.tsx
│   │   │   │   ├── jobs.tsx
│   │   │   │   ├── leagues.tsx
│   │   │   │   ├── login.tsx
│   │   │   │   ├── odds.tsx
│   │   │   │   ├── seasons.tsx
│   │   │   │   ├── settings/
│   │   │   │   ├── settings.tsx
│   │   │   │   ├── sync-center.tsx
│   │   │   │   └── teams.tsx
│   │   │   ├── services/                 # API service layer
│   │   │   │   ├── batches.service.ts
│   │   │   │   ├── bookmakers.service.ts
│   │   │   │   ├── countries.service.ts
│   │   │   │   ├── fixtures.service.ts
│   │   │   │   ├── jobs.service.ts
│   │   │   │   ├── leagues.service.ts
│   │   │   │   ├── markets.service.ts
│   │   │   │   ├── odds.service.ts
│   │   │   │   ├── seasons.service.ts
│   │   │   │   ├── sync.service.ts
│   │   │   │   └── teams.service.ts
│   │   │   ├── types/
│   │   │   │   ├── admin-ui.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── bookmakers.ts
│   │   │   │   ├── breadcrumbs.ts
│   │   │   │   ├── countries.ts
│   │   │   │   ├── fixtures.ts
│   │   │   │   ├── leagues.ts
│   │   │   │   ├── odds.ts
│   │   │   │   ├── seasons.ts
│   │   │   │   └── teams.ts
│   │   │   ├── App.tsx
│   │   │   ├── App.css
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── tailwind.config.js
│   │
│   ├── mobile/                         # Mobile app (Expo/React Native)
│   │   ├── app/                         # Expo Router pages
│   │   │   ├── _layout.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── explore.tsx
│   │   │   │   └── index.tsx
│   │   │   └── modal.tsx
│   │   ├── components/
│   │   │   ├── external-link.tsx
│   │   │   ├── haptic-tab.tsx
│   │   │   ├── hello-wave.tsx
│   │   │   ├── parallax-scroll-view.tsx
│   │   │   ├── themed-text.tsx
│   │   │   ├── themed-view.tsx
│   │   │   └── ui/
│   │   ├── hooks/
│   │   │   ├── use-color-scheme.ts
│   │   │   ├── use-color-scheme.web.ts
│   │   │   └── use-theme-color.ts
│   │   ├── constants/
│   │   │   └── theme.ts
│   │   ├── assets/
│   │   │   └── images/
│   │   ├── package.json
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── metro.config.js
│   │   └── tsconfig.json
│   │
│   └── server/                         # Fastify backend server
│       ├── src/
│       │   ├── auth/                    # Authentication modules
│       │   │   ├── admin-auth.types.ts   # Admin auth types
│       │   │   ├── admin-cookies.ts     # Admin cookie helpers
│       │   │   ├── admin-session.ts     # Admin session management
│       │   │   ├── user-auth.types.ts   # User auth types
│       │   │   ├── user-refresh-session.ts  # User refresh token sessions
│       │   │   └── user-tokens.ts       # JWT access tokens + refresh tokens
│       │   │
│       │   ├── constants/               # Constants
│       │   │   ├── admin-auth.constants.ts
│       │   │   ├── jobs.constants.ts
│       │   │   ├── roles.constants.ts
│       │   │   └── user-auth.constants.ts
│       │   │
│       │   ├── plugins/                 # Fastify plugins
│       │   │   ├── admin-auth.ts         # Admin auth plugin
│       │   │   ├── errors.ts            # Error handling plugin
│       │   │   ├── jobs-scheduler.ts    # Job scheduler plugin
│       │   │   └── user-auth.ts         # User auth plugin
│       │   │
│       │   ├── routes/                  # API routes
│       │   │   ├── admin/               # Admin routes
│       │   │   │   ├── auth/
│       │   │   │   │   └── auth.route.ts
│       │   │   │   ├── jobs/
│       │   │   │   │   ├── job-runs.route.ts
│       │   │   │   │   ├── jobs-config.route.ts
│       │   │   │   │   └── jobs.actions.route.ts
│       │   │   │   └── sync-center/
│       │   │   │       ├── db/          # Database routes
│       │   │   │       │   ├── batches.route.ts
│       │   │   │       │   ├── bookmakers.route.ts
│       │   │   │       │   ├── countries.route.ts
│       │   │   │       │   ├── fixtures.route.ts
│       │   │   │       │   ├── health.route.ts
│       │   │   │       │   ├── leagues.route.ts
│       │   │   │       │   ├── odds.route.ts
│       │   │   │       │   ├── seasons.route.ts
│       │   │   │       │   └── teams.route.ts
│       │   │   │       ├── provider/    # Provider routes
│       │   │   │       │   ├── bookmakers.route.ts
│       │   │   │       │   ├── countries.route.ts
│       │   │   │       │   ├── fixtures-season.route.ts
│       │   │   │       │   ├── fixtures.route.ts
│       │   │   │       │   ├── leagues.route.ts
│       │   │   │       │   ├── markets.route.ts
│       │   │   │       │   ├── odds.route.ts
│       │   │   │       │   ├── seasons.route.ts
│       │   │   │       │   └── teams.route.ts
│       │   │   │       └── sync/        # Sync routes
│       │   │   │           ├── bookmakers.route.ts
│       │   │   │           ├── countries.route.ts
│       │   │   │           ├── fixtures.route.ts
│       │   │   │           ├── leagues.route.ts
│       │   │   │           ├── seasons.route.ts
│       │   │   │           └── teams.route.ts
│       │   │   ├── api/                 # Public API routes
│       │   │   │   └── fixtures.route.ts
│       │   │   ├── auth/               # User auth routes
│       │   │   │   └── auth.route.ts   # POST /auth/register, /login, /google, /refresh, /logout, GET /me
│       │   │   └── health.route.ts
│       │   │
│       │   ├── schemas/                 # JSON schemas for validation
│       │   │   ├── admin/
│       │   │   │   ├── admin.schemas.ts
│       │   │   │   ├── auth.schemas.ts
│       │   │   │   ├── bookmakers.schemas.ts
│       │   │   │   ├── countries.schemas.ts
│       │   │   │   ├── fixtures.schemas.ts
│       │   │   │   ├── health.schemas.ts
│       │   │   │   ├── jobs.schemas.ts
│       │   │   │   ├── leagues.schemas.ts
│       │   │   │   ├── odds.schemas.ts
│       │   │   │   ├── seasons.schemas.ts
│       │   │   │   └── teams.schemas.ts
│       │   │   ├── auth/
│       │   │   │   └── user-auth.schemas.ts
│       │   │   ├── fixtures.schemas.ts
│       │   │   ├── health.schemas.ts
│       │   │   ├── index.ts
│       │   │   └── README.md
│       │   │
│       │   ├── services/                # Business logic services
│       │   │   ├── admin/
│       │   │   │   ├── admin-auth.service.ts
│       │   │   │   └── jobs-config.service.ts
│       │   │   ├── api/
│       │   │   │   └── api.fixtures.service.ts
│       │   │   ├── auth/
│       │   │   │   └── user-auth.service.ts  # User auth service (register, login, google, refresh, logout)
│       │   │   ├── bookmakers.service.ts
│       │   │   ├── countries.service.ts
│       │   │   ├── fixtures.service.ts
│       │   │   ├── leagues.service.ts
│       │   │   ├── odds.service.ts
│       │   │   ├── seasons.service.ts
│       │   │   └── teams.service.ts
│       │   │
│       │   ├── types/                   # TypeScript type definitions
│       │   │   ├── bookmakers.ts
│       │   │   ├── countries.ts
│       │   │   ├── fastify.d.ts         # Fastify type extensions
│       │   │   ├── fixtures.ts
│       │   │   ├── health.ts
│       │   │   ├── index.ts
│       │   │   ├── jobs.ts
│       │   │   ├── leagues.ts
│       │   │   ├── odds.ts
│       │   │   └── seasons.ts
│       │   │
│       │   ├── utils/                   # Utility functions
│       │   │   ├── adapter.ts
│       │   │   ├── crypto.ts           # Shared crypto utilities (sha256, random token)
│       │   │   ├── dates.ts
│       │   │   ├── errors/              # Error classes
│       │   │   │   ├── app-error.ts
│       │   │   │   ├── db-to-app.ts
│       │   │   │   └── index.ts
│       │   │   ├── logger.ts
│       │   │   └── routes.ts
│       │   │
│       │   ├── jobs/                    # Background jobs
│       │   │   ├── finished-fixtures.job.ts
│       │   │   ├── jobs.cli.ts
│       │   │   ├── jobs.db.ts
│       │   │   ├── jobs.definitions.ts
│       │   │   ├── jobs.meta.ts
│       │   │   ├── jobs.registry.ts
│       │   │   ├── live-fixtures.job.ts
│       │   │   ├── upcoming-fixtures.job.ts
│       │   │   └── update-prematch-odds.job.ts
│       │   │
│       │   ├── etl/                     # ETL scripts
│       │   │   └── seeds/
│       │   │       ├── seed.bookmakers.ts
│       │   │       ├── seed.cli.ts
│       │   │       ├── seed.countries.ts
│       │   │       ├── seed.fixtures.ts
│       │   │       ├── seed.index.ts
│       │   │       ├── seed.jobs.ts
│       │   │       ├── seed.leagues.ts
│       │   │       ├── seed.odds.ts
│       │   │       ├── seed.seasons.ts
│       │   │       ├── seed.teams.ts
│       │   │       └── seed.utils.ts
│       │   │
│       │   ├── scripts/
│       │   │   └── createAdmin.ts
│       │   │
│       │   ├── app.ts                   # Fastify app setup
│       │   └── server.ts                # Server entry point
│       │
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── packages/                            # Shared packages
│   ├── db/                              # Prisma database package
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Prisma schema
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── http/
│   │   │   │   ├── admin.ts            # Admin API response types
│   │   │   │   ├── api.ts              # Public API response types
│   │   │   │   └── auth.ts             # User auth API response types
│   │   │   ├── jobs/
│   │   │   │   ├── meta.ts
│   │   │   │   └── run.ts
│   │   │   ├── sport-data/
│   │   │   │   ├── common.ts
│   │   │   │   ├── fixtures.ts
│   │   │   │   └── sportmonks.ts
│   │   │   ├── user.ts
│   │   │   ├── version.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sports-data/                     # Sports data adapters
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   └── sportmonks/
│   │   │   │       ├── helpers.ts
│   │   │   │       └── sportmonks.adapter.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/                          # Shared utilities
│   │   ├── src/
│   │   │   └── http.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── eslint-config/                   # ESLint configurations
│   │   ├── base.js
│   │   ├── next.js
│   │   ├── react-internal.js
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── typescript-config/               # TypeScript configurations
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   ├── react-library.json
│   │   └── package.json
│   │
│   └── ui/                              # Shared UI components
│       ├── src/
│       └── package.json
│
├── services/
│   └── worker/                          # Background worker service
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                         # Root package.json
├── pnpm-workspace.yaml                  # pnpm workspace config
├── turbo.json                           # Turborepo config
└── README.md
```

## Key Directories

### Server (`apps/server/src/`)

**Authentication:**

- `auth/` - Authentication modules (admin and user auth separated)
- `plugins/` - Fastify plugins (admin-auth, user-auth, errors, jobs-scheduler)
- `routes/auth/` - User authentication routes (`/auth/*`)

**Core:**

- `routes/` - API route handlers
- `services/` - Business logic services
- `schemas/` - JSON schemas for request/response validation
- `types/` - TypeScript type definitions
- `utils/` - Utility functions (crypto, errors, dates, etc.)

**Background Jobs:**

- `jobs/` - Background job definitions and registry
- `etl/seeds/` - Database seeding scripts

### Packages

- `packages/db/` - Prisma database schema and client
- `packages/types/` - Shared TypeScript types for API responses
- `packages/sports-data/` - Sports data provider adapters
- `packages/shared/` - Shared utilities

## Authentication Structure

### Admin Auth

- Routes: `/admin/auth/*`
- Plugin: `plugins/admin-auth.ts`
- Service: `services/admin/admin-auth.service.ts`
- Uses: Sessions table + httpOnly cookies

### User Auth

- Routes: `/auth/*`
- Plugin: `plugins/user-auth.ts`
- Service: `services/auth/user-auth.service.ts`
- Uses: JWT access tokens + refresh tokens (stored in refreshSessions table)
