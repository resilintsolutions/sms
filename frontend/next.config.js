/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // API proxy is now handled by src/app/api/v1/[...path]/route.ts
  // which preserves the Host header for multi-domain institution resolution.
  // The rewrite approach is kept as a commented fallback:
  // async rewrites() {
  //   return [
  //     { source: '/api/:path*', destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*` },
  //   ];
  // },
  env: {
    NEXT_PUBLIC_PLATFORM_DOMAIN: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'school.local',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Ensure plugin receives a defined config (avoids "clientModules" undefined error)
module.exports = withNextIntl(nextConfig ?? {});
