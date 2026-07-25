import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Radar, PenLine, Repeat, Inbox, ListChecks, BookOpen, Sparkles, ShieldCheck, Globe, FolderKanban } from 'lucide-react';
import { FEATURES } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Lead discovery, human outreach, follow-up automation, inbox intelligence, daily call lists and a grounded knowledge base.',
  alternates: { canonical: '/features' },
  openGraph: { url: '/features', title: `Features — ${BRAND.name}` },
};

const ICONS: Record<string, React.ElementType> = { Radar, PenLine, Repeat, Inbox, ListChecks, BookOpen };

export default function FeaturesPage() {
  return (
    <>
      <section className="relative overflow-hidden py-20 text-center" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)' }}>
        <div className="mx-auto max-w-3xl px-5">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-semibold text-white/80"><Sparkles size={13} className="text-[#E0457E]" /> One console, the whole motion</div>
          <h1 className="text-[38px] font-black tracking-tight text-white md:text-[52px]">Every step of outbound, handled</h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/65">From the first search to the booked meeting — the agent runs what it should, and hands you what needs a human.</p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl space-y-20 px-5">
          {FEATURES.map((f, i) => {
            const Ico = ICONS[f.icon] || Sparkles;
            return (
              <div key={f.title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? 'md:[direction:rtl]' : ''}`}>
                <div className="md:[direction:ltr]">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}><Ico size={26} /></span>
                  <h2 className="mt-5 text-[26px] font-black tracking-tight text-[#16121F]">{f.title}</h2>
                  <p className="mt-3 text-[16px] leading-relaxed text-[#6A6478]">{f.desc}</p>
                </div>
                <div className="md:[direction:ltr]">
                  <div className="aspect-[4/3] rounded-2xl border border-[#ECEAF1] p-6" style={{ background: 'linear-gradient(135deg,rgba(164,53,232,.06),rgba(224,69,126,.05))' }}>
                    <div className="flex h-full flex-col justify-center gap-2.5">
                      {[92, 68, 80, 55].map((w, k) => (
                        <div key={k} className="flex items-center gap-2.5">
                          <span className="h-8 w-8 flex-none rounded-lg" style={{ background: k === 0 ? 'linear-gradient(135deg,#A435E8,#E0457E)' : '#ECEAF1' }} />
                          <span className="h-3 rounded-full" style={{ width: `${w}%`, background: k === 0 ? 'linear-gradient(90deg,#A435E8,#E0457E)' : '#ECEAF1' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#FBFAFD] py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-[30px] font-black tracking-tight text-[#16121F]">Built on foundations you can trust</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: FolderKanban, t: 'Multi-project by design', d: 'Run many businesses from one login — each with isolated leads, voice, language and knowledge.' },
              { icon: Globe, t: 'Any market, any language', d: 'The platform in English, your outreach in Swedish, German, French — set per project.' },
              { icon: ShieldCheck, t: 'Private & secured', d: 'Row-level security scopes every record to your workspace. Your keys and data never leak across accounts.' },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-[#ECEAF1] bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: 'rgba(164,53,232,.1)', color: '#A435E8' }}><c.icon size={20} /></span>
                <h3 className="mt-4 text-[17px] font-extrabold text-[#16121F]">{c.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#6A6478]">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-[13px] px-7 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 8px 28px rgba(164,53,232,.4)' }}>Start free <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
