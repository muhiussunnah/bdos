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
      <svg width={s * 0.64} height={s * 0.64} viewBox="0 0 100 100" fill="none" aria-hidden>
        {/* K stem */}
        <path d="M30 20 V80" stroke="white" strokeWidth="12.5" strokeLinecap="round" />
        {/* K lower leg */}
        <path d="M39 52 L64 80" stroke="white" strokeWidth="12.5" strokeLinecap="round" />
        {/* rising growth arm */}
        <path d="M39 52 L78 24" stroke="white" strokeWidth="12.5" strokeLinecap="round" />
        {/* arrowhead ↗ */}
        <path d="M60 24 L78 24 L78 42" stroke="white" strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
