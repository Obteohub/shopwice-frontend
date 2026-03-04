# Deployment Guide (Cloudflare Pages)

This repository deploys with Cloudflare Pages, not PM2.

## Build

Run the OpenNext Pages build:

```bash
npm run pages:build
```

## Deploy

Deploy the generated output directory:

```bash
npx wrangler pages deploy .cf-pages-deploy --project-name shopwice-frontend --branch main
```

If deploying from a dirty local workspace:

```bash
npx wrangler pages deploy .cf-pages-deploy --project-name shopwice-frontend --branch main --commit-dirty=true
```

## Required Notes

- Cloudflare Pages project: `shopwice-frontend`
- Build command (CI): `npm run pages:build`
- Output directory (CI): `.cf-pages-deploy`
- Do not use PM2 or `next start` for production deployment in this repo.
