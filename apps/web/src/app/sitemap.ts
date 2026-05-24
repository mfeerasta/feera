import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.feera.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Phase 1: static routes only. M5 adds dynamic /play/clubs/[slug] entries
  // by querying the clubs table where is_active = true AND approval_status = 'approved'.
  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/play`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/play/clubs`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/play/open`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/clubs`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/clubs/onboard`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/courts`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/courts/configure`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/edition`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/edition/apply`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/sign-in`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
