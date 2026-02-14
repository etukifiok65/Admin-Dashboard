# Cloudflare Pages Deployment Instructions

## The Issue
Your Admin Dashboard appears blank because **environment variables are not configured** in Cloudflare Pages.

## Fix: Configure Environment Variables

### Step 1: Go to Cloudflare Pages Settings
1. Log in to your Cloudflare dashboard
2. Navigate to **Workers & Pages**
3. Select your **Admin-Dashboard** project
4. Go to **Settings** → **Environment variables**

### Step 2: Add Production Environment Variables

Add the following environment variables for **Production**:

| Variable Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://spjqtdxnspndnnluayxp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc` |
| `VITE_APP_NAME` | `HomiCareplus Admin` |
| `VITE_APP_ENVIRONMENT` | `production` |

### Step 3: Redeploy
After adding the environment variables:
1. Push these new changes to your repository (or trigger a new deployment)
2. Cloudflare will automatically rebuild with the environment variables
3. Your app will now work correctly

## What Changed

1. **`public/_redirects`** - Routes all requests to index.html for React Router
2. **`public/_headers`** - Security and caching headers
3. **`src/App.tsx`** - Now shows helpful error message if env vars are missing
4. **`src/services/supabase.ts`** - Better error messaging

## Alternative: Environment Variables in Build Command

If the above doesn't work, you can also try adding them inline in the build command:
```bash
VITE_SUPABASE_URL=https://spjqtdxnspndnnluayxp.supabase.co VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc npm run build
```

## Verify It's Working

Once redeployed, if environment variables are still missing, you'll see a clear error message on the page telling you exactly what's missing. 
