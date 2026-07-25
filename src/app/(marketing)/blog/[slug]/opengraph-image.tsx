import { ImageResponse } from 'next/og';
import { getPost } from '@/lib/marketing';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Klientic blog';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title || 'The Klientic blog';
  const category = post?.category || 'Klientic';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 72,
          background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)',
          color: '#fff', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#A435E8,#E0457E)', fontSize: 38, fontWeight: 900 }}>K</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Klientic</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#E0457E', marginBottom: 20 }}>{category}</div>
          <div style={{ fontSize: 60, fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,.5)' }}>klientic.com/blog</div>
      </div>
    ),
    size
  );
}
