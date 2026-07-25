import { BRAND } from '@/lib/constants';

/** Klientic logo mark — a geometric K on a gradient tile. Pure, no hooks. */
export function LogoMark({ size = 36, radius, glow = true }: { size?: number; radius?: number; glow?: boolean }) {
  const s = size;
  return (
    <span
      className="inline-grid flex-none place-items-center"
      style={{
        width: s,
        height: s,
        borderRadius: radius ?? s * 0.28,
        background: 'linear-gradient(135deg,#B44BF0 0%,#A435E8 45%,#E0457E 100%)',
        boxShadow: glow ? '0 6px 18px rgba(164,53,232,.38), inset 0 1px 0 rgba(255,255,255,.25)' : undefined,
      }}
    >
      <svg width={s * 0.6} height={s * 0.6} viewBox="0 0 100 100" fill="none" aria-hidden>
        <path d="M33 22 V78" stroke="white" strokeWidth="13" strokeLinecap="round" />
        <path d="M71 22 L41 50 L73 78" stroke="white" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ size = 34, dark = false, className = '' }: { size?: number; dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="text-[17px] font-black tracking-tight" style={{ color: dark ? '#fff' : '#16121F' }}>
        {BRAND.name}
      </span>
    </span>
  );
}
