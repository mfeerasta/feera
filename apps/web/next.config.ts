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
  // typedRoutes disabled for M2 — Link href casts in admin shell need a polish pass.
  // Re-enable in M3 once apps/web/src/lib/admin Link helpers wrap href with Route.
  typedRoutes: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.feera.ai' },
      { protocol: 'https', hostname: '*.your-objectstorage.com' },
    ],
  },
  transpilePackages: ['@feera/ui', '@feera/matching', '@feera/types', '@feera/db', '@feera/payments'],
};

export default config;
