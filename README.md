# Shopwice Frontend

Headless ecommerce frontend for Shopwice, built with Next.js 16, React 19, and WooCommerce REST APIs.

## Stack

- Next.js 16
- React 19
- Zustand
- Tailwind CSS
- WooCommerce Store API and custom REST endpoints
- Cloudflare Pages

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env.local`.
3. Set the required environment variables.
4. Install dependencies with `npm install`.
5. Start development with `npm run dev`.

## SEO

- Rank Math metadata is fetched from the WordPress backend.
- Frontend exposes `/robots.txt` and `/sitemap.xml`.
- Staging should remain `noindex`.

## Testing

- E2E: `npx playwright test`
- SEO tests: `npm run test:seo`
- Lighthouse CI: `npm run lhci`

## Deployment

Cloudflare Pages deployment notes live in `CLOUDFLARE_DEPLOY.md`.

## License

ISC
