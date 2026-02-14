# Admin Dashboard Deployment Guide

## Pre-Deployment Checklist

- [ ] All database migrations applied to production
- [ ] Admin user created in production database
- [ ] Environment variables configured
- [ ] Build passes type checking (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in build output
- [ ] Testing completed on staging environment

## Deployment Platforms

### Option 1: Vercel (Recommended)

Vercel provides the best experience for Next.js and React apps.

#### Steps:

1. Push code to GitHub
2. Connect Vercel to your GitHub repository
3. Set environment variables in Vercel dashboard:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=https://api.yourdomain.com
   ```
4. Vercel auto-deploys on push to main branch

#### Configuration (vercel.json):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Option 2: Netlify

#### Steps:

1. Connect GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set environment variables in Netlify UI
5. Deploy

#### netlify.toml:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: AWS S3 + CloudFront

#### Steps:

1. Build the app: `npm run build`
2. Create S3 bucket:
   ```bash
   aws s3 mb s3://homicare-admin-dashboard
   ```
3. Upload build:
   ```bash
   aws s3 sync dist/ s3://homicare-admin-dashboard --delete
   ```
4. Create CloudFront distribution pointing to S3
5. Set environment variables via CloudFront headers or build-time injection

### Option 4: Docker + Self-Hosted

#### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build
RUN npm run build

# Use lightweight HTTP server
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
```

#### Docker Compose:

```yaml
version: '3.8'
services:
  admin-dashboard:
    build:
      context: ./admin-dashboard
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
      VITE_API_URL: ${VITE_API_URL}
    restart: unless-stopped
```

## Environment-Specific Configs

### Development (.env.local)
```env
VITE_SUPABASE_URL=https://your-dev.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key
VITE_API_URL=http://localhost:3001
```

### Staging (.env.staging)
```env
VITE_SUPABASE_URL=https://your-staging.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
VITE_API_URL=https://api-staging.yourdomain.com
```

### Production (.env.production)
```env
VITE_SUPABASE_URL=https://your-prod.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
VITE_API_URL=https://api.yourdomain.com
```

## Post-Deployment

1. Test login with admin credentials
2. Verify dashboard loads all pages
3. Check browser console for errors
4. Test data fetching from Supabase
5. Monitor error logs

## Security Considerations

### CORS Configuration

Update Supabase CORS settings to allow your domain:

1. Go to Supabase Project Settings > API
2. Add your deployment URL to allowed origins

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Example: rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### API Key Protection

Never commit secrets to git:

- Use `.env.local` (in .gitignore)
- Use platform-specific secret management (Vercel, Netlify, etc.)
- Rotate keys periodically

## Monitoring & Logging

### Application Performance Monitoring

Add Sentry for error tracking:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.VITE_APP_ENVIRONMENT,
});
```

### Database Monitoring

Use Supabase built-in monitoring:
1. Go to Supabase Dashboard > Logs > Database
2. Set up alerts for slow queries
3. Monitor auth logs for failed login attempts

### Analytics

Implement Google Analytics or similar:

```typescript
// add to main.tsx
import ReactGA from 'react-ga4';

ReactGA.initialize("GA_MEASUREMENT_ID");
```

## Rollback Procedure

If deployment has issues:

1. **Vercel/Netlify**: Click "Rollback" on previous deployment
2. **S3**: Restore from previous version
3. **Docker**: Pull and run previous image tag

## CI/CD Pipeline Example (GitHub Actions)

```yaml
name: Deploy Admin Dashboard

on:
  push:
    branches: [main]
    paths:
      - 'admin-dashboard/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: admin-dashboard
      
      - name: Type check
        run: npm run type-check
        working-directory: admin-dashboard
      
      - name: Build
        run: npm run build
        working-directory: admin-dashboard
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Deploy to Vercel
        run: npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: admin-dashboard
```

## Troubleshooting Deployment

### Build fails
- Check Node.js version matches requirements
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

### Environment variables not loading
- Check variable names match (case-sensitive)
- Ensure variables are set in deployment platform
- For Vite, variables must start with `VITE_`

### CORS errors
- Verify domain is in Supabase CORS allowed list
- Check browser console for exact error
- May need to configure backend CORS headers

### Blank page on load
- Check network requests in DevTools
- Verify Supabase endpoint is accessible
- Check browser console for JavaScript errors
