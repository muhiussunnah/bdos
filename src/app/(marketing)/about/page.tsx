import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why we built an AI operating system for client acquisition.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about', title: `About — ${BRAND.name}` },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden py-20 text-center" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)' }}>
        <div className="mx-auto max-w-3xl px-5">
          <h1 className="text-[38px] font-black tracking-tight text-white md:text-[52px]">We give sales teams their week back</h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/65">{BRAND.name} exists to remove everything from outbound that doesn’t need a human — and to make the human moments count.</p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-2xl space-y-6 px-5 text-[17px] leading-[1.75] text-[#3a3546]">
          <p>Outbound is mostly overhead. Research, list-building, first drafts, follow-up discipline, inbox triage, call prep — the quiet work that eats a rep’s week before they ever have a real conversation.</p>
          <p>We built {BRAND.name} on a simple belief: <b className="text-[#16121F]">the AI is not the salesperson</b>. It’s the research assistant, the SDR, the outreach coordinator, the follow-up manager and the inbox assistant. It creates leverage. People still close the relationships that matter.</p>
          <p>So the agent drafts, scores, chases and triages — and the moment anything touches pricing, contracts, partnerships or strategy, it stops and hands the conversation to a human. Fast outbound that never feels automated to the person on the other end.</p>
        </div>
      </section>

      <section className="bg-[#FBFAFD] py-16">
        <div className="mx-auto grid max-w-4xl gap-6 px-5 text-center sm:grid-cols-3">
          {[['Multi-project', 'Run every business from one console'], ['Bring your own AI', 'Your keys, your model, at cost'], ['Private by default', 'Row-level security on every record']].map(([a, b]) => (
            <div key={a} className="rounded-2xl border border-[#ECEAF1] bg-white p-6">
              <div className="text-[17px] font-extrabold text-[#16121F]">{a}</div>
              <div className="mt-1 text-[13.5px] text-[#6A6478]">{b}</div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-[13px] px-7 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 8px 28px rgba(164,53,232,.4)' }}>Start free <ArrowRight size={17} /></Link>
        </div>
      </section>
    </>
  );
}
