import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Radar, PenLine, Repeat, Inbox, ListChecks, BookOpen, Check, Sparkles, Star } from 'lucide-react';
import { FEATURES, STEPS, PROVIDERS_LOGOS, TESTIMONIALS, TIERS } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${BRAND.name} — AI business development on autopilot`,
  description: 'Find leads, qualify them, write human outreach, chase follow-ups and triage replies — on autopilot. Your team closes.',
};

const ICONS: Record<string, React.ElementType> = { Radar, PenLine, Repeat, Inbox, ListChecks, BookOpen };

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)' }}>
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(164,53,232,.45), transparent 60%)' }} />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 text-center md:pt-28">
          <Link href="/blog/ai-is-not-the-salesperson" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-semibold text-white/80 transition hover:bg-white/10">
            <Sparkles size={13} className="text-[#E0457E]" /> The AI is the leverage — not the salesperson <ArrowRight size={12} />
          </Link>
          <h1 className="mx-auto max-w-4xl text-balance text-[40px] font-black leading-[1.04] tracking-tight text-white md:text-[64px]">
            Your autonomous{' '}
            <span style={{ background: 'linear-gradient(135deg,#C77BFF,#FF8FB8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>business-development</span>{' '}
            operating system
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-white/65 md:text-[19px]">
            {BRAND.name} finds leads, qualifies them, writes human outreach, chases follow-ups and triages every reply — automatically. Your team keeps the closing.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-[13px] px-6 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 8px 28px rgba(164,53,232,.45)' }}>
              Start free — no card <ArrowRight size={17} />
            </Link>
            <Link href="/features" className="rounded-[13px] border border-white/15 bg-white/5 px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-white/10">See how it works</Link>
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-white/45">
            <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-[#E0457E] text-[#E0457E]" />)}</div>
            Loved by outbound teams across the Nordics
          </div>

          {/* product preview */}
          <div className="mx-auto mt-16 max-w-5xl">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Logos ────────────────────────────────────────────── */}
      <section className="border-b border-[#ECEAF1] bg-white py-10">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-[12px] font-bold uppercase tracking-wider text-[#9C97A8]">Works with the AI &amp; infrastructure you already trust</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {PROVIDERS_LOGOS.map((l) => <span key={l} className="text-[17px] font-extrabold tracking-tight text-[#B7B2C2]">{l}</span>)}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="bg-[#FBFAFD] py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Everything, in one console" title="The whole outbound motion — automated" sub="From the first search to the booked meeting, BDOS runs the parts that don't need a human, and hands you the parts that do." />
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Ico = ICONS[f.icon] || Sparkles;
              return (
                <div key={f.title} className="group rounded-2xl border border-[#ECEAF1] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(20,18,28,.08)]">
                  <span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}><Ico size={22} /></span>
                  <h3 className="mt-5 text-[18px] font-extrabold tracking-tight text-[#16121F]">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#6A6478]">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="How it works" title="Set it up once. It hunts every day." />
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-[#ECEAF1] bg-[#FBFAFD] p-6">
                <span className="text-[13px] font-black tracking-widest" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.n}</span>
                <h3 className="mt-3 text-[16px] font-extrabold tracking-tight text-[#16121F]">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6A6478]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics band ─────────────────────────────────────── */}
      <section className="py-6">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 rounded-3xl px-8 py-12 text-center text-white sm:grid-cols-3" style={{ background: 'linear-gradient(135deg,#171022,#241636)' }}>
            {[['10+', 'sources checked per lead'], ['3·7·21', 'day follow-up cadence'], ['<60s', 'to prep for any call']].map(([a, b]) => (
              <div key={b}>
                <div className="text-[44px] font-black tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>{a}</div>
                <div className="mt-1 text-[14px] text-white/55">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="bg-[#FBFAFD] py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Loved by operators" title="Pipelines that follow themselves up" />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-[#ECEAF1] bg-white p-6">
                <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={15} className="fill-[#E0457E] text-[#E0457E]" />)}</div>
                <p className="mt-4 text-[15px] leading-relaxed text-[#16121F]">“{t.quote}”</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-black text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{t.name[0]}</span>
                  <div><div className="text-[14px] font-bold text-[#16121F]">{t.name}</div><div className="text-[12.5px] text-[#9C97A8]">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Simple pricing" title="Start free. Scale when it works." sub="Bring your own AI key — you pay model costs at cost, never marked up." />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.name} className={`relative rounded-2xl border p-6 ${t.highlight ? 'border-transparent text-white' : 'border-[#ECEAF1] bg-white'}`}
                style={t.highlight ? { background: 'linear-gradient(135deg,#171022,#241636)' } : undefined}>
                {t.highlight && <span className="absolute right-5 top-5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">Popular</span>}
                <div className={`text-[15px] font-extrabold ${t.highlight ? 'text-white' : 'text-[#16121F]'}`}>{t.name}</div>
                <div className="mt-3 flex items-end gap-1">
                  <span className={`text-[40px] font-black tracking-tight ${t.highlight ? 'text-white' : 'text-[#16121F]'}`} style={{ fontFamily: 'var(--font-mono)' }}>${t.price}</span>
                  <span className={`pb-2 text-[13px] ${t.highlight ? 'text-white/50' : 'text-[#9C97A8]'}`}>/mo</span>
                </div>
                <p className={`mt-1 text-[13.5px] ${t.highlight ? 'text-white/60' : 'text-[#6A6478]'}`}>{t.tagline}</p>
                <Link href="/login" className={`mt-5 block rounded-xl py-2.5 text-center text-[14px] font-bold transition ${t.highlight ? 'bg-white text-[#16121F] hover:bg-white/90' : 'text-white hover:-translate-y-0.5'}`}
                  style={t.highlight ? undefined : { background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{t.cta}</Link>
                <ul className="mt-6 space-y-2.5">
                  {t.features.slice(0, 4).map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-[13.5px] ${t.highlight ? 'text-white/80' : 'text-[#16121F]'}`}>
                      <Check size={15} className={t.highlight ? 'text-[#E0457E]' : 'text-[#A435E8]'} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center"><Link href="/pricing" className="text-[14px] font-bold text-[#A435E8] hover:underline">Compare all plans →</Link></div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-8 py-16 text-center text-white" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636, #0E0916)' }}>
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(164,53,232,.5), transparent 60%)' }} />
          <h2 className="relative mx-auto max-w-2xl text-[32px] font-black leading-tight tracking-tight md:text-[42px]">Give your team back the week outbound eats.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[16px] text-white/60">Set up your first project in minutes. Watch the agent fill your pipeline by morning.</p>
          <Link href="/login" className="relative mt-8 inline-flex items-center gap-2 rounded-[13px] px-7 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 8px 28px rgba(164,53,232,.45)' }}>
            Start free <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-[13px] font-bold uppercase tracking-wider text-[#A435E8]">{eyebrow}</div>
      <h2 className="mt-3 text-[30px] font-black leading-tight tracking-tight text-[#16121F] md:text-[40px]">{title}</h2>
      {sub && <p className="mt-4 text-[16px] leading-relaxed text-[#6A6478]">{sub}</p>}
    </div>
  );
}

function DashboardPreview() {
  const stages = [['New', 42], ['Contacted', 28], ['Follow-up', 19], ['Positive', 11], ['Meeting', 6]] as const;
  const max = 42;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_40px_120px_rgba(0,0,0,.5)]">
      <div className="flex items-center gap-2 border-b border-[#ECEAF1] bg-[#FBFAFD] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#E5484D]" /><span className="h-3 w-3 rounded-full bg-[#E08C1F]" /><span className="h-3 w-3 rounded-full bg-[#16A34A]" />
        <span className="ml-3 text-[12px] font-semibold text-[#9C97A8]">app.bdos — Dashboard</span>
      </div>
      <div className="grid grid-cols-[150px_1fr] text-left">
        <div className="hidden flex-col gap-1 p-3 sm:flex" style={{ background: '#0E0916' }}>
          {['Dashboard', 'Autopilot', 'Leads', 'Outreach', 'Inbox', 'Reports'].map((n, i) => (
            <div key={n} className={`rounded-lg px-3 py-2 text-[12px] font-semibold ${i === 0 ? 'bg-white/10 text-white' : 'text-white/50'}`}>{n}</div>
          ))}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {[['Pipeline', '106'], ['Positive', '11'], ['Sent', '284']].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-[#ECEAF1] bg-white p-3">
                <div className="text-[11px] font-semibold text-[#6A6478]">{l}</div>
                <div className="mt-1 text-[22px] font-black text-[#16121F]" style={{ fontFamily: 'var(--font-mono)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#ECEAF1] bg-white p-4">
            <div className="mb-3 text-[12px] font-bold text-[#16121F]">Lead pipeline</div>
            <div className="flex items-end gap-3" style={{ height: 90 }}>
              {stages.map(([name, n]) => (
                <div key={name} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="w-full rounded-md" style={{ height: `${(n / max) * 100}%`, background: 'linear-gradient(180deg,#A435E8,#E0457E)' }} />
                  <span className="text-[10px] font-semibold text-[#9C97A8]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
