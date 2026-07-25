/* eslint-disable @next/next/no-img-element */
import type { BlogPost } from '@/lib/marketing';

/** Branded blog thumbnail — gradient + Klientic logo, with an "X vs Klientic" layout for comparison posts. */
export function BlogThumb({ post, className = '', big = false }: { post: BlogPost; className?: string; big?: boolean }) {
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background: post.gradient }}>
      {/* grid + glow */}
      <div className="absolute inset-0 opacity-[.13]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle,rgba(255,255,255,.55),transparent 70%)' }} />

      <div className={`relative flex h-full w-full flex-col justify-between text-white ${big ? 'p-7' : 'p-5'}`}>
        {/* brand row */}
        <div className="flex items-center gap-2">
          <img src="/logo.webp" alt="" width={big ? 30 : 24} height={big ? 30 : 24} className={big ? 'h-7 w-7' : 'h-6 w-6'} />
          <span className={`font-black tracking-tight ${big ? 'text-[16px]' : 'text-[13px]'}`}>Klientic</span>
          <span className={`ml-auto rounded-full bg-black/25 px-2.5 py-0.5 font-bold uppercase tracking-wider backdrop-blur ${big ? 'text-[11px]' : 'text-[9.5px]'}`}>{post.category}</span>
        </div>

        {/* center */}
        {post.vs ? (
          <div className="flex items-center justify-center gap-2.5">
            <div className="rounded-xl bg-black/30 px-3 py-2 text-center backdrop-blur">
              <div className={`font-bold text-white/75 ${big ? 'text-[18px]' : 'text-[14px]'}`}>{post.vs}</div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[.12em] text-white/45">general AI</div>
            </div>
            <div className={`grid flex-none place-items-center rounded-full bg-white/20 font-black backdrop-blur ${big ? 'h-10 w-10 text-[13px]' : 'h-8 w-8 text-[11px]'}`}>VS</div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2" style={{ color: '#16121F' }}>
              <img src="/logo.webp" alt="" width={20} height={20} className={big ? 'h-5 w-5' : 'h-4 w-4'} />
              <div className="text-left">
                <div className={`font-black leading-none ${big ? 'text-[18px]' : 'text-[14px]'}`}>Klientic</div>
                <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[.1em]" style={{ color: '#16A34A' }}>client engine</div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`max-w-[85%] font-black leading-tight tracking-tight ${big ? 'text-[27px]' : 'text-[19px]'}`}
            style={{ textShadow: '0 2px 18px rgba(0,0,0,.22)' }}>
            {post.kicker || 'Client acquisition, on autopilot.'}
          </div>
        )}

        {/* bottom */}
        <div className={`flex items-center gap-1.5 font-semibold text-white/75 ${big ? 'text-[12.5px]' : 'text-[11px]'}`}>
          <span>{post.readTime} read</span><span className="opacity-50">·</span><span>klientic.com</span>
        </div>
      </div>
    </div>
  );
}
