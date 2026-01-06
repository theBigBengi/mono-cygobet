# Admin UI (Vite + React Router)

## Environment

This app talks to the backend **via httpOnly cookie auth**, so requests must include cookies.

Set the admin API origin:

```bash
# apps/admin/.env.local (or your deploy env vars)
VITE_ADMIN_API_BASE_URL=http://localhost:4000
```

Notes:
- In **dev**, `vite.config.ts` proxies `/admin/*` to `http://localhost:4000`, so leaving `VITE_ADMIN_API_BASE_URL` empty can still work.
- In **production**, the app will throw a clear error if `VITE_ADMIN_API_BASE_URL` (or legacy `VITE_API_URL`) is missing.

## Run locally

From the repo root:

```bash
# terminal 1: backend
pnpm -C apps/server dev

# terminal 2: admin UI
pnpm -C apps/admin dev
```

Then open `http://localhost:5173/login`.

## Manual test steps

- Go to `/login`, sign in with an admin user.
- You should be redirected to `/` and see **Hello {name/email}** in the header.
- Refresh the page: you should still be authenticated (cookie-based).
- Click **Logout**: you should be redirected back to `/login`.

## CORS + cookies (important)

If `/admin/auth/me` returns **401 in the browser** but works in `curl`, it’s almost always cookie/CORS configuration.

Backend must allow credentials:
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin` must be the **exact** admin frontend origin (not `*`)

If frontend and API are on different domains, the cookie must be:
- `sameSite: "none"`
- `secure: true`
