
# Deploying to Cloudflare Pages

1. **Commit & Push**: Ensure all changes (including `package.json` and `next.config.js`) are pushed to your git repository.

2. **Cloudflare Dashboard**:
   - Go to Cloudflare Pages.
   - "Connect to Git" and select this repository.

3. **Build Settings**:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npx @cloudflare/next-on-pages` (or `npm run pages:build`)
   - **Output Directory**: `.vercel/output/static` (Important: next-on-pages outputs here)
   - **Node Version**: Set an Environment Variable `NODE_VERSION` to `20` (or compatible).

4. **Environment Variables** (CRITICAL):
   - You noted "Environment variables: None". **This will cause the app to fail.**
   - You MUST add your keys (e.g., `NEXT_PUBLIC_GRAPHQL_URL`, `NEXT_PUBLIC_REST_API_URL`).
   - Copy them from your local `.env` file.

5. **Deploy**:
   - Save the settings.
   - Go to "Deployments" and trigger a new deployment (or push a commit).

## Troubleshooting Your Current Error
You received `[ERROR] Missing entry-point`. This happened because your configuration was:
- Build command: `npm run build` (WRONG - this is for standard Node servers)
- Deploy command: `npx wrangler deploy` (WRONG - Pages handles this)

**Correct Configuration:**
- **Build command:** `npm run pages:build`
- **Build output directory:** `.vercel/output/static`
- **Deploy command:** (Leave empty / default)


