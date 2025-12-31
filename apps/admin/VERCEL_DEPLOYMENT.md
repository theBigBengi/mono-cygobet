# Vercel Deployment Guide

## Recommended: Direct API URL (Simplest)

### Step 1: Set Environment Variable in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `VITE_API_URL` = `https://your-api-server.com` (your API base URL)

**Important:** Make sure your API server has CORS enabled to allow requests from your Vercel domain.

### Step 2: Deploy

That's it! The API client will automatically use `VITE_API_URL` if set.

---

## Alternative: API Proxy via Vercel Serverless Function

If you need to proxy requests (e.g., to avoid CORS issues), create a serverless function:

### Step 1: Create API Proxy Function

Create `api/proxy/[...path].ts` in your admin app:

```typescript
// api/proxy/[...path].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_URL = process.env.API_URL || "http://localhost:4000";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join("/") : path || "";

  const queryString = req.url?.includes("?")
    ? req.url.substring(req.url.indexOf("?"))
    : "";

  const url = `${API_URL}/admin/${pathString}${queryString}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization && {
          Authorization: req.headers.authorization,
        }),
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error", message: String(error) });
  }
}
```

### Step 2: Install Vercel Types

```bash
pnpm add -D @vercel/node
```

### Step 3: Set Environment Variable

In Vercel project settings, add: `API_URL` = `https://your-api-server.com`

### Step 4: Update vercel.json

Update `vercel.json` to use the proxy:

```json
{
  "rewrites": [
    {
      "source": "/admin/:path*",
      "destination": "/api/proxy/:path*"
    }
  ]
}
```

---

## Development

In development, the Vite proxy (configured in `vite.config.ts`) automatically handles `/admin/*` requests and proxies them to `http://localhost:4000`.

No changes needed - it works automatically!
