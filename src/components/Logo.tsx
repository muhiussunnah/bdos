import { BRAND } from '@/lib/constants';

/** Klientic logo mark — the brand tile (K + growth arrow). Renders the real brand asset. */
export function LogoMark({ size = 36, glow = true, className = '' }: { size?: number; radius?: number; glow?: boolean; className?: string }) {
  const s = size;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.webp"
      alt=""
      aria-hidden
      width={s}
      height={s}
      className={`inline-block flex-none select-none ${className}`}
      style={{ width: s, height: s, filter: glow ? 'drop-shadow(0 5px 14px rgba(164,53,232,.4))' : undefined }}
    />
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
