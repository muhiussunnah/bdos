import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Klientic — Find, win & keep clients on autopilot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#A435E8,#E0457E)', fontSize: 44, fontWeight: 900, marginRight: 20 }}>K</div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Klientic</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 70, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>Turn cold companies into</div>
          <div style={{ fontSize: 70, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: '#FF8FB8' }}>paying clients — on autopilot.</div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,.6)', marginTop: 26 }}>The all-in-one client acquisition engine.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,.5)' }}>klientic.com</div>
      </div>
    ),
    size
  );
}
