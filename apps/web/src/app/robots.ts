import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/play/bookings/'],
      },
    ],
    sitemap: 'https://www.feera.ai/sitemap.xml',
    host: 'https://www.feera.ai',
  };
}
