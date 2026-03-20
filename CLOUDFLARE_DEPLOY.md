
# Deploying to Cloudflare Pages

Use two separate Cloudflare Pages projects from the same repository.

## Projects

1. `shopwice-frontend-prod`
   - Production branch: `main`
   - Domains: `shopwice.com`, `www.shopwice.com`

2. `shopwice-frontend-staging`
   - Production branch: `staging` (or `develop`)
   - Domain: `staging.shopwice.com`

This keeps deployments, environment variables, and access controls separate.

## Shared Build Settings

- Framework preset: `Next.js`
- Build command: `npm run pages:build`
- Build output directory: `.cf-pages-deploy`
- Node version: set `NODE_VERSION=20`

Do not use `npm run build` or `wrangler deploy` for Pages deployments.

## Required Environment Variables

Set these in each Pages project individually. Do not rely on `wrangler.toml` for host-specific values.

### Production

- `NEXT_PUBLIC_SITE_URL=https://shopwice.com`
- `NEXT_PUBLIC_SITE_NOINDEX=false`
- `NEXT_PUBLIC_WP_API_URL=https://shopwice.com`
- `NEXT_PUBLIC_REST_API_URL=https://api.shopwice.com/api`
- `NEXT_PUBLIC_STORE_API_URL=https://api.shopwice.com/api`

### Staging

- `NEXT_PUBLIC_SITE_URL=https://staging.shopwice.com`
- `NEXT_PUBLIC_SITE_NOINDEX=true`
- `NEXT_PUBLIC_WP_API_URL=https://shopwice.com`
- `NEXT_PUBLIC_REST_API_URL=https://api.shopwice.com/api`
- `NEXT_PUBLIC_STORE_API_URL=https://api.shopwice.com/api`

Use staging-safe values for anything stateful or external:

- payment keys
- analytics IDs
- webhook targets
- email/SMS providers
- auth callback URLs

## DNS

- Point `shopwice.com` and `www.shopwice.com` to the production Pages project
- Point `staging.shopwice.com` to the staging Pages project

## Staging Safety

Staging should have all of these:

- `NEXT_PUBLIC_SITE_NOINDEX=true`
- `X-Robots-Tag: noindex, nofollow`
- `robots.txt` returning `Disallow: /`
- Access protection through Cloudflare Access, basic auth, or IP restriction

## Notes

- `next-sitemap.config.js` now reads `NEXT_PUBLIC_SITE_URL`, so staging and production builds generate host-correct sitemap URLs.
- The runtime `/sitemap.xml` route suppresses sitemap entries when `NEXT_PUBLIC_SITE_NOINDEX=true`, so staging does not advertise production sitemap URLs.


