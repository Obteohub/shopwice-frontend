/** @type {import('next').NextConfig} */
const nextConfig = {
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
        hostname: 'web.shopwice.com',
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
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
    // Keep optimization enabled so Next can generate right-sized images per viewport.
    unoptimized: false,
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
        source: '/:all*(svg|jpg|png|webp|avif|js|css|woff2)',
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
    ];
  },

};

module.exports = nextConfig;
