import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, ArrowRight } from 'lucide-react';
import { TIERS, FAQS } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Pricing — ${BRAND.name}`,
  description: 'Simple, transparent pricing. Bring your own AI key and pay model costs at cost. Start free.',
};

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden py-20 text-center" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)' }}>
        <div className="mx-auto max-w-3xl px-5">
          <h1 className="text-[38px] font-black tracking-tight text-white md:text-[52px]">Pricing that scales with your pipeline</h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/65">Bring your own AI key — you pay model costs at cost, never marked up. Every plan starts with a free trial.</p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`relative flex flex-col rounded-2xl border p-7 ${t.highlight ? 'border-transparent text-white shadow-[0_30px_80px_rgba(164,53,232,.25)]' : 'border-[#ECEAF1] bg-white'}`}
              style={t.highlight ? { background: 'linear-gradient(135deg,#171022,#241636)' } : undefined}>
              {t.highlight && <span className="absolute right-6 top-6 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">Most popular</span>}
              <div className={`text-[16px] font-extrabold ${t.highlight ? 'text-white' : 'text-[#16121F]'}`}>{t.name}</div>
              <div className="mt-4 flex items-end gap-1">
                <span className={`text-[46px] font-black tracking-tight ${t.highlight ? 'text-white' : 'text-[#16121F]'}`} style={{ fontFamily: 'var(--font-mono)' }}>${t.price}</span>
                <span className={`pb-2.5 text-[14px] ${t.highlight ? 'text-white/50' : 'text-[#9C97A8]'}`}>/month</span>
              </div>
              <p className={`mt-2 text-[14px] leading-relaxed ${t.highlight ? 'text-white/60' : 'text-[#6A6478]'}`}>{t.tagline}</p>
              <Link href="/login" className={`mt-6 flex items-center justify-center gap-1.5 rounded-xl py-3 text-[14px] font-bold transition ${t.highlight ? 'bg-white text-[#16121F] hover:bg-white/90' : 'text-white hover:-translate-y-0.5'}`}
                style={t.highlight ? undefined : { background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 4px 14px rgba(164,53,232,.3)' }}>{t.cta} <ArrowRight size={15} /></Link>
              <ul className="mt-7 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-[14px] ${t.highlight ? 'text-white/85' : 'text-[#16121F]'}`}>
                    <Check size={16} className={`mt-0.5 flex-none ${t.highlight ? 'text-[#E0457E]' : 'text-[#A435E8]'}`} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-[13px] text-[#9C97A8]">All plans include row-level security, unlimited team members on Scale, and no per-email fees.</p>
      </section>

      <section className="bg-[#FBFAFD] py-24">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-[30px] font-black tracking-tight text-[#16121F] md:text-[38px]">Frequently asked</h2>
          <div className="mt-10 divide-y divide-[#ECEAF1] overflow-hidden rounded-2xl border border-[#ECEAF1] bg-white">
            {FAQS.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] font-bold text-[#16121F]">
                  {f.q}<span className="text-[#A435E8] transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[#6A6478]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

function FinalCta() {
  return (
    <section className="px-5 pb-24 pt-4">
      <div className="mx-auto max-w-4xl rounded-3xl px-8 py-14 text-center text-white" style={{ background: 'linear-gradient(135deg,#171022,#241636)' }}>
        <h2 className="text-[28px] font-black tracking-tight md:text-[36px]">Ready to fill your pipeline?</h2>
        <Link href="/login" className="mt-7 inline-flex items-center gap-2 rounded-[13px] px-7 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 8px 28px rgba(164,53,232,.45)' }}>Start free <ArrowRight size={17} /></Link>
      </div>
    </section>
  );
}
