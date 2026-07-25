import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/marketing';

const BASE = 'https://klientic.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/features', '/pricing', '/blog', '/about', '/contact', '/privacy', '/terms'];
  const staticRoutes: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${BASE}${r}`,
    lastModified: new Date(),
    changeFrequency: r === '' ? 'daily' : 'weekly',
    priority: r === '' ? 1 : 0.7,
  }));
  const posts: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));
  return [...staticRoutes, ...posts];
}
