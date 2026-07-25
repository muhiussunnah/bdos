import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/admin/', '/api/', '/auth/'],
    },
    sitemap: 'https://klientic.com/sitemap.xml',
    host: 'https://klientic.com',
  };
}
