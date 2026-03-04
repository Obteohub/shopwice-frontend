
![Shopwice Banner](https://github.com/user-attachments/assets/08047025-0950-472a-ae7d-932c7faee1db)

# Shopwice - Next.js Ecommerce (WooCommerce REST Backend)

A high-performance, modern eCommerce frontend for **Shopwice**, built with **Next.js 16**, **React 19**, and the **WooCommerce Store API**.

---

## 🚀 Overview

This project is a Progressive Web App (PWA) optimized for speed, reliability, and visual excellence. It has been migrated from a GraphQL architecture to a more stable and high-performance **REST-based architecture** using the WooCommerce Store API for cart/session management and a custom normalization layer for product data.

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1 (Pages Router)
- **Library**: React 19.2
- **State Management**: Zustand 5.0 (with persistent localStorage hydration)
- **Styling**: Tailwind CSS 3.4
- **API**: WooCommerce Store API (REST) + custom REST endpoints
- **Icons & Animations**: Framer Motion, Lucide-like icons
- **Testing**: Playwright (E2E), LHCI (Performance)
- **Deployment**: Optimized for Cloudflare Pages

## ✨ Key Features

- **Store API Migration**: Fully migrated from GraphQL to REST for superior session isolation and reduced latency.
- **Progressive Web App (PWA)**: Offline support, manifest integration, and an custom installation prompt.
- **Robust Data Normalization**: A dedicated `normalizeProduct` layer ensures that varying REST API responses are mapped to a consistent structure for frontend components.
- **Hydration Stabilization**: Custom hooks (`useIsMounted`) prevent hydration mismatches caused by server-side rendering of dynamic elements.
- **Advanced Cart Flow**: Nonce-based authentication for secure, isolated user sessions.
- **Dynamic Product Pages**: Multi-endpoint data aggregation for reviews, related products, and variations.
- **Performance Optimized**: Automated Lighthouse monitoring on every PR.

## 📂 Internal Documentation

For detailed technical guides, refer to:
- [Store API Migration Guide](STORE_API_MIGRATION.md)
- [Cart Flow & Session Management](CART_FLOW_EXPLAINED.md)
- [WC Store API Deep Dive](WC_STORE_API_GUIDE.md)
- [PWA Status & Implementation](CART_FINAL_STATUS.md)

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Obteohub/shopwice-frontend.git
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and set your API base URLs:
   ```env
   NEXT_PUBLIC_REST_API_URL=https://api.shopwice.com/api
   NEXT_PUBLIC_STORE_API_URL=https://api.shopwice.com/api
   NEXT_PUBLIC_WP_API_URL=https://admin.shopwice.com
   NEXT_PUBLIC_SITE_URL=https://shopwice.com
   ```

## SEO (RankMath, Headless)

- SEO metadata for product and archive pages is fetched from the WordPress RankMath endpoint:
  - `GET /wp-json/rankmath/v1/getHead?url=<full-frontend-url>`
- Frontend exposes:
  - `/sitemap.xml` (proxied from RankMath sitemap index)
  - `/robots.txt` (frontend robots + sitemap pointer)
- WordPress backend must be set to **noindex**:
  - WordPress Admin -> `Settings` -> `Reading` -> enable `Discourage search engines from indexing this site`.
  - This avoids backend URLs competing with frontend canonicals in search.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing

Run E2E tests with Playwright:
```bash
npx playwright test
```

Generate Lighthouse performance reports:
```bash
npm run lhci
```

## ⚠️ Known Issues & Troubleshooting

### **Build Cache Issues**
If you encounter "Apollo Runtime Invariant" errors (remnants of legacy GraphQL), clear the build cache:
```powershell
Remove-Item -Recurse -Force .next
```

### **Image Domain Authorization**
Ensure `api.shopwice.com` and `cdn.shopwice.com` are whitelisted in `next.config.js`.

---

## 📝 License
This project is licensed under the ISC License.
Implement UserRegistration.component.tsx in a registration page
- Add user dashboard with order history
- Add Cloudflare Turnstile on registration page
- Ensure email is real on registration page
- Add total to cart/checkout page
- Copy billing address to shipping address
- Hide products not in stock

# Lighthouse Performance Monitoring

This project uses automated Lighthouse testing through GitHub Actions to ensure high-quality web performance. On every pull request:

- Performance, accessibility, best practices, and SEO are automatically evaluated
- Results are posted directly to the pull request
- Minimum score thresholds are enforced for:
  - Performance: Analyzing loading performance, interactivity, and visual stability
  - Accessibility: Ensuring WCAG compliance and inclusive design
  - Best Practices: Validating modern web development standards
  - SEO: Checking search engine optimization fundamentals
  - PWA: Assessing Progressive Web App capabilities
