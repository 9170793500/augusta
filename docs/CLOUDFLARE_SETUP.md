# Cloudflare — login "Server not configured" (repeat fix)

## Why it breaks again after a few days

Usually one of these:

1. **Only static files deploy** — `dist` upload without `npx wrangler deploy`. Then `/api/supabase-config` returns the HTML homepage and login fails.
2. **Variables only under "Build"** — rebuild without them → no config in JS/JSON.
3. **Variables only under Preview** — `Uat` branch builds as Preview; Production domain still has old deploy.
4. **Two projects** — Pages project on `agaoa.com` and Worker `augusta` separate; domain points to the wrong one.

## Correct setup (one time)

### 1. One Worker project: `augusta`

**Workers Builds → Settings**

| Field | Value |
|--------|--------|
| Build command | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |

Without **Deploy command = wrangler**, the Worker never runs.

### 2. Worker runtime variables (main — survives redeploys)

**Workers & Pages → augusta → Settings → Variables → Production**

| Name | Type | Value |
|------|------|--------|
| `VITE_SUPABASE_URL` | Plaintext | Same as local `.env` |
| `VITE_SUPABASE_ANON_KEY` | Plaintext | Same as local `.env` |

Same names for **Preview** if you deploy `Uat` branch.

### 3. Optional: Build variables

Also add the same two as **Build** variables so `dist/supabase-config.json` is generated. Helpful if Worker is misconfigured; not a replacement for Worker deploy.

### 4. After deploy — quick test

Open in browser (must be **JSON**, not the homepage):

- https://agaoa.com/api/health → `{"worker":true,"supabaseConfigured":true}`
- https://agaoa.com/api/supabase-config → `{"url":"...","anonKey":"..."}`

If you see the Augusta landing page HTML, the Worker is **not** live on that URL.

## Optional: GitHub Actions (variables in GitHub, not Cloudflare UI)

Add repo secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Use workflow `.github/workflows/deploy-uat.yml` when enabled.