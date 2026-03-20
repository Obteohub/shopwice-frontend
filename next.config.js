/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const disableSentry = process.env.DISABLE_SENTRY === 'true';
const forceNoindex =
  String(process.env.NEXT_PUBLIC_SITE_NOINDEX || process.env.SITE_NOINDEX || '').toLowerCase() === 'true';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  compress: true,
  devIndicators: false,
  compiler: {
    removeConsole: false,
  },
  experimental: {
    // allowedDevOrigins removed as it causes validation error
  },
  // Trigger restart 1
  images: {
    loader: 'custom',
    loaderFile: './src/utils/nextImageLoader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shopwice.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'api.shopwice.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.shopwice.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'staging.shopwice.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopwice.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      },
    ],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 693, 750, 828, 960, 1080, 1200, 1440, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 80, 96, 112, 128, 160, 192, 240, 256, 277, 320, 384, 420, 540, 600],
    qualities: [75, 90],
    // Use a custom loader that points at our Cloudflare-backed image proxy so
    // Next can still generate responsive srcset URLs without using the built-in optimizer.
    // Prefer modern formats to reduce bytes on hero image transfers.
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          ],
        },
        {
          source: '/_next/webpack-hmr',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          ],
        },
      ];
    }

    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|js|css|woff2)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          ...(forceNoindex
            ? [
                {
                  key: 'X-Robots-Tag',
                  value: 'noindex, nofollow',
                },
              ]
            : []),
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/brand/von',
        destination: '/brand/avon',
        permanent: true,
      },
      {
        source: '/brand/von/:path*',
        destination: '/brand/avon/:path*',
        permanent: true,
      },
      {
        source: '/tag/:path*',
        destination: '/collection/:path*',
        permanent: true,
      },
    ];
  },
  webpack(config) {
    if (disableSentry) {
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['@sentry/nextjs'] = require('path').resolve(__dirname, 'src/utils/sentryStub.ts');
    }

    return config;
  },

};

module.exports = withBundleAnalyzer(nextConfig);




// Injected content via Sentry wizard below

if (!disableSentry) {
  const { withSentryConfig } = require("@sentry/nextjs");

  module.exports = withSentryConfig(module.exports, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "shopwice",
    project: "shopwice-frontend",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    webpack: {
      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,

      // Tree-shaking options for reducing bundle size
      treeshake: {
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        removeDebugLogging: true,
      },
    },
  });
}
