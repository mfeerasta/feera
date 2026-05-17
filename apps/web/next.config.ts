import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Pin workspace root so standalone bundle doesn't nest under absolute paths.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  turbopack: {
    root: path.join(__dirname, '../../'),
  },
  typedRoutes: true,
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
