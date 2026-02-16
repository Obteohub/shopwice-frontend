/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
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
    unoptimized: true,
  },
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  async headers() {
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
  
};

module.exports = nextConfig;
