import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Required for Docker deploy on Hetzner.
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.feera.ai' },
      { protocol: 'https', hostname: '*.your-objectstorage.com' },
    ],
  },
  transpilePackages: ['@feera/ui', '@feera/matching', '@feera/types'],
};

export default config;
