'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, ArrowRight, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { TIERS, FAQS } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';

export default function PricingPage() {
  const [mode, setMode] = useState<'monthly' | 'lifetime'>('monthly');

  return (
    <>
      <section className="relative overflow-hidden py-20 text-center aurora">
        <div className="pointer-events-none absolute inset-0 grid-fade opacity-60" />
        <div className="relative mx-auto max-w-3xl px-5">
          <h1 className="text-[38px] font-black tracking-tight text-white md:text-[54px]">Pricing that pays for itself</h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/70">One won client covers the year. Bring your own AI key — you pay model costs at cost, never marked up.</p>

          {/* toggle */}
          <div className="mt-9 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[.06] p-1 backdrop-blur">
            <button onClick={() => setMode('monthly')}
              className={`rounded-full px-5 py-2 text-[13.5px] font-bold transition ${mode === 'monthly' ? 'text-[#16121F]' : 'text-white/70'}`}
              style={mode === 'monthly' ? { background: '#fff' } : undefined}>Monthly</button>
            <button onClick={() => setMode('lifetime')}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13.5px] font-bold transition ${mode === 'lifetime' ? 'text-[#16121F]' : 'text-white/70'}`}
              style={mode === 'lifetime' ? { background: '#fff' } : undefined}>
              Lifetime <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black" style={{ background: mode === 'lifetime' ? 'linear-gradient(135deg,#A435E8,#E0457E)' : 'rgba(255,255,255,.15)', color: '#fff' }}>ONE-TIME</span>
            </button>
          </div>
          {mode === 'lifetime' && <p className="mt-3 text-[13px] font-semibold text-[#FF8FB8]">Pay once, own it forever — no recurring fees.</p>}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl items-start gap-5 px-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`relative flex flex-col rounded-2xl border p-7 transition ${t.highlight ? 'border-transparent text-white md:-mt-3 md:mb-3' : 'border-[#ECEAF1] bg-white'}`}
              style={t.highlight ? { background: 'linear-gradient(135deg,#171022,#2a1240)', boxShadow: '0 30px 80px rgba(164,53,232,.28)' } : undefined}>
              {t.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wide text-white"
                  style={{ background: t.highlight ? 'linear-gradient(135deg,#A435E8,#E0457E)' : '#16121F', boxShadow: '0 8px 20px rgba(164,53,232,.4)' }}>
                  {t.badge}
                </span>
              )}
              <div className={`text-[16px] font-extrabold ${t.highlight ? 'text-white' : 'text-[#16121F]'}`}>{t.name}</div>

              <div className="mt-4 flex items-end gap-1">
                <span className={`text-[46px] font-black leading-none tracking-tight ${t.highlight ? 'text-white' : 'text-[#16121F]'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                  ${mode === 'monthly' ? t.monthly : t.lifetime}
                </span>
                <span className={`pb-2 text-[14px] ${t.highlight ? 'text-white/50' : 'text-[#9C97A8]'}`}>{mode === 'monthly' ? '/month' : 'once'}</span>
              </div>
              <p className={`mt-1.5 flex items-center gap-1.5 text-[13px] ${t.highlight ? 'text-white/55' : 'text-[#9C97A8]'}`}>
                {mode === 'monthly'
                  ? <>or <b className={t.highlight ? 'text-white/80' : 'text-[#6A6478]'}>${t.lifetime}</b> once — lifetime</>
                  : <><InfinityIcon size={14} /> yours forever · no subscription</>}
              </p>

              <p className={`mt-4 text-[14px] leading-relaxed ${t.highlight ? 'text-white/60' : 'text-[#6A6478]'}`}>{t.tagline}</p>

              <Link href="/login" className={`mt-6 flex items-center justify-center gap-1.5 rounded-xl py-3 text-[14px] font-bold transition ${t.highlight ? 'bg-white text-[#16121F] hover:bg-white/90' : 'text-white hover:-translate-y-0.5'}`}
                style={t.highlight ? undefined : { background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 4px 14px rgba(164,53,232,.3)' }}>
                {mode === 'lifetime' ? 'Get lifetime access' : t.cta} <ArrowRight size={15} />
              </Link>

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
        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[13px] text-[#9C97A8]"><Sparkles size={13} className="text-[#A435E8]" /> All plans: 14-day free trial · row-level security · no per-email fees</p>
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

      <section className="px-5 pb-24 pt-4">
        <div className="mx-auto max-w-4xl rounded-3xl px-8 py-14 text-center text-white aurora">
          <h2 className="text-[28px] font-black tracking-tight md:text-[38px]">One won client pays for the year.</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-white/65">Start free today. Upgrade only when {BRAND.name} is already filling your pipeline.</p>
          <Link href="/login" className="mt-7 inline-flex items-center gap-2 rounded-[14px] px-7 py-4 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 10px 34px rgba(164,53,232,.5)' }}>Start free <ArrowRight size={17} /></Link>
        </div>
      </section>
    </>
  );
}
