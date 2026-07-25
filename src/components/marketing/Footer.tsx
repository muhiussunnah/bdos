import Link from 'next/link';
import { BRAND } from '@/lib/constants';

const COLS = [
  { title: 'Product', links: [['Features', '/features'], ['Pricing', '/pricing'], ['Log in', '/login'], ['Start free', '/login']] },
  { title: 'Company', links: [['About', '/about'], ['Blog', '/blog'], ['Contact', '/contact']] },
  { title: 'Legal', links: [['Privacy', '/privacy'], ['Terms', '/terms']] },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#ECEAF1] bg-[#0E0916] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] text-[16px] font-black text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>B</span>
            <span className="text-[16px] font-black tracking-tight">{BRAND.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-white/55">{BRAND.tagline} An AI business-development operating system for teams that hunt.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-white/40">{c.title}</div>
            <ul className="space-y-2">
              {c.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="text-[14px] font-medium text-white/70 transition hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-[13px] text-white/45 sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>Built for teams that hunt.</span>
        </div>
      </div>
    </footer>
  );
}
