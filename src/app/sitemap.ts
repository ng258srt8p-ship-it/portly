import type { MetadataRoute } from 'next';

const SITE_URL = 'https://portly-1i0.pages.dev';

/** Stable URLs — also referenced by public/robots.txt */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}> = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/deals', changeFrequency: 'daily', priority: 0.9 },
  { path: '/history', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/solo', changeFrequency: 'daily', priority: 0.8 },
  { path: '/alerts', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/press', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/careers', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/disclosure', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
