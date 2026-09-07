import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight, Radar, PenLine, Repeat, Inbox, ListChecks, BookOpen, Check, Sparkles, Star,
  TrendingDown, Clock, Hand, Wallet, Zap, CheckCircle2, CalendarCheck,
} from 'lucide-react';
import { FEATURES, STEPS, PROVIDERS_LOGOS, TESTIMONIALS, TIERS } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';
import { HeroDashboard } from '@/components/marketing/HeroDashboard';
import { AuthCta } from '@/components/marketing/AuthCta';

const HOME_TITLE = `${BRAND.name} — Win new clients while you sleep`;
const HOME_DESC =
  'Stop chasing leads. Klientic finds your ideal clients, writes the outreach, chases every follow-up, and books the meetings — automatically. One won client pays for the year. Start free, no card.';
export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESC,
  alternates: { canonical: '/' },
  openGraph: { url: '/', title: HOME_TITLE, description: HOME_DESC },
  twitter: { title: HOME_TITLE, description: HOME_DESC },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Klientic',
      url: 'https://klientic.com',
      logo: 'https://klientic.com/favicon.svg',
      description: 'Klientic wins new clients on autopilot — it finds your ideal clients, writes the outreach, chases every follow-up, and books the meetings while you sleep.',
    },
    {
      '@type': 'WebSite',
      name: 'Klientic',
      url: 'https://klientic.com',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Klientic',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '49', priceCurrency: 'USD' },
    },
  ],
};

const FICON: Record<string, React.ElementType> = { Radar, PenLine, Repeat, Inbox, ListChecks, BookOpen };

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Hero />
      <LogoMarquee />
      <PainSolution />
      <Bento />
      <HowItWorks />
      <Outcomes />
      <Testimonials />
      <PricingTeaser />
      <FinalCta />
    </>
  );
}

/* ── HERO ─────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden aurora">
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[-8%] h-[520px] w-[900px] -translate-x-1/2 rounded-full anim-glow" style={{ background: 'radial-gradient(circle, rgba(164,53,232,.5), transparent 62%)' }} />
      <div className="pointer-events-none absolute right-[6%] top-[36%] h-64 w-64 rounded-full anim-glow" style={{ background: 'radial-gradient(circle, rgba(224,69,126,.4), transparent 65%)', animationDelay: '2s' }} />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 text-center md:pt-24">
        <Link href="/features" className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-1.5 text-[13px] font-semibold text-white/85 backdrop-blur transition hover:bg-white/10">
          <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}><Sparkles size={9} /></span>
          The all-in-one client acquisition engine <ArrowRight size={12} />
        </Link>

        <h1 className="mx-auto max-w-4xl text-balance text-[42px] font-black leading-[1.02] tracking-tight text-white md:text-[68px]">
          Turn cold companies into{' '}
          <span className="text-grad">paying clients</span>{' '}
          — while you sleep
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-white/70 md:text-[20px]">
          {BRAND.name} finds your ideal clients, writes the outreach, chases every follow-up and books the meetings —
          automatically. Stop leaking revenue on leads you never contacted. Stop losing weeks to manual prospecting.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <AuthCta className="group inline-flex items-center gap-2 rounded-[14px] px-7 py-4 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 10px 34px rgba(164,53,232,.5)' }}>
            Start free — no card <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
          </AuthCta>
          <Link href="/features" className="rounded-[14px] border border-white/15 bg-white/5 px-7 py-4 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/10">See how it works</Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/50">
          <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#7CE7A8]" /> 14-day free trial</span>
          <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#7CE7A8]" /> Bring your own AI key</span>
          <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#7CE7A8]" /> Cancel anytime</span>
        </div>

        {/* floating product visual */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="anim-float">
            <HeroDashboard />
          </div>
          {/* satellite cards */}
          <FloatCard className="anim-float2 -left-4 -top-6 hidden md:flex lg:-left-10 xl:-left-20" delay="1s"
            icon={<CheckCircle2 size={16} className="text-[#16A34A]" />} title="New lead scored 94" sub="Nordic Trampoline AB · Priority A" />
          <FloatCard className="anim-float -right-4 -top-6 hidden md:flex lg:-right-10 xl:-right-20" delay="0s"
            icon={<Sparkles size={16} className="text-[#A435E8]" />} title="Reply classified: Positive" sub="Draft ready · needs your approval" />
          <FloatCard className="anim-float2 -right-3 -bottom-6 hidden lg:flex lg:-right-8 xl:-right-16" delay="2.5s"
            icon={<CalendarCheck size={16} className="text-[#2563EB]" />} title="Meeting booked" sub="Thu 14:00 · added to call list" />
        </div>
      </div>
    </section>
  );
}

function FloatCard({ icon, title, sub, className = '', delay }: { icon: React.ReactNode; title: string; sub: string; className?: string; delay?: string }) {
  return (
    <div className={`absolute z-20 items-center gap-3 rounded-2xl px-4 py-3 glass-card ${className}`} style={{ animationDelay: delay }}>
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F4F3F7]">{icon}</span>
      <div className="text-left"><div className="text-[13px] font-bold text-[#16121F]">{title}</div><div className="text-[11.5px] text-[#6A6478]">{sub}</div></div>
    </div>
  );
}

/* ── LOGO MARQUEE ─────────────────────────────────────────── */
function LogoMarquee() {
  const row = [...PROVIDERS_LOGOS, ...PROVIDERS_LOGOS];
  return (
    <section className="border-b border-[#ECEAF1] bg-white py-9">
      <p className="text-center text-[12px] font-bold uppercase tracking-wider text-[#9C97A8]">Plugs into the AI &amp; infrastructure you already trust</p>
      <div className="relative mt-6 overflow-hidden" style={{ maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
        <div className="anim-marquee flex w-max gap-14 pr-14">
          {row.map((l, i) => <span key={i} className="whitespace-nowrap text-[18px] font-extrabold tracking-tight text-[#C3BECD]">{l}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ── PAIN → SOLUTION ──────────────────────────────────────── */
const PAINS = [
  { icon: Wallet, pain: 'Revenue leaks out', from: 'Leads slip through the cracks and follow-ups never happen.', to: 'Every lead is scored, contacted and chased on a set cadence — nothing forgotten.' },
  { icon: Clock, pain: 'Weeks lost to busywork', from: 'Reps burn hours researching lists and writing cold emails.', to: 'The agent researches, drafts and sends — your team only touches warm replies.' },
  { icon: Hand, pain: 'Growth stays manual', from: 'Pipeline only grows when someone remembers to prospect.', to: 'A tireless engine fills your pipeline every single day, automatically.' },
  { icon: TrendingDown, pain: 'Feast-or-famine clients', from: 'You scramble for clients the moment a project ends.', to: 'A steady inbound of qualified conversations — so you never start from zero.' },
];

function PainSolution() {
  return (
    <section className="bg-[#0E0916] py-24 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[13px] font-bold uppercase tracking-wider" style={{ color: '#E0457E' }}>The problem it kills</div>
          <h2 className="mt-3 text-[32px] font-black leading-tight tracking-tight md:text-[44px]">The money you’re leaving on the table, recovered</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/60">Most teams lose clients not to competitors — but to their own missed follow-ups and manual prospecting. {BRAND.name} closes that gap.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {PAINS.map((p) => (
            <div key={p.pain} className="rounded-2xl border border-white/10 bg-white/[.03] p-6 transition hover:bg-white/[.06]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: 'rgba(229,72,77,.14)', color: '#FF7A7E' }}><p.icon size={20} /></span>
                <h3 className="text-[18px] font-extrabold tracking-tight">{p.pain}</h3>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-white/45 line-through decoration-white/20">{p.from}</p>
              <div className="mt-2 flex items-start gap-2 text-[14.5px] leading-relaxed text-white/90">
                <Zap size={16} className="mt-0.5 flex-none" style={{ color: '#7CE7A8' }} /> {p.to}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── BENTO FEATURES ───────────────────────────────────────── */
function Bento() {
  const spans = ['md:col-span-4', 'md:col-span-2', 'md:col-span-2', 'md:col-span-4', 'md:col-span-3', 'md:col-span-3'];
  return (
    <section className="bg-[#FBFAFD] py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="One console, the whole motion" title="Everything you need to acquire clients" sub="From the first search to the booked meeting — all in one place, all automated." />
        <div className="mt-14 grid gap-4 md:grid-cols-6">
          {FEATURES.map((f, i) => {
            const Ico = FICON[f.icon] || Sparkles;
            const wide = spans[i]?.includes('col-span-4');
            return (
              <div key={f.title} className={`group relative overflow-hidden rounded-2xl border border-[#ECEAF1] bg-white p-6 transition hover:-translate-y-1 hover:border-[#D9AEF4] hover:shadow-[0_24px_60px_rgba(164,53,232,.12)] ${spans[i]}`}>
                <span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 6px 16px rgba(164,53,232,.3)' }}><Ico size={22} /></span>
                <h3 className="mt-5 text-[19px] font-extrabold tracking-tight text-[#16121F]">{f.title}</h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#6A6478]">{f.desc}</p>
                {wide && <MiniVisual variant={i === 0 ? 'leads' : 'inbox'} />}
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 transition group-hover:opacity-100" style={{ background: 'radial-gradient(circle,rgba(164,53,232,.14),transparent 70%)' }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MiniVisual({ variant }: { variant: 'leads' | 'inbox' }) {
  if (variant === 'leads') {
    return (
      <div className="mt-6 space-y-2">
        {[['Nordic Trampoline AB', 94, 'A'], ['Vasa Museum Events', 81, 'B'], ['Skansen Group', 67, 'C']].map(([n, s, p]) => (
          <div key={n as string} className="flex items-center gap-3 rounded-xl border border-[#ECEAF1] bg-[#FBFAFD] px-3 py-2">
            <span className="text-[13px] font-bold text-[#16121F]">{n}</span>
            <span className="ml-auto text-[12px] font-bold" style={{ fontFamily: 'var(--font-mono)', color: (s as number) >= 80 ? '#16A34A' : '#E08C1F' }}>{s}</span>
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: p === 'A' ? '#E5484D' : p === 'B' ? '#E08C1F' : '#2563EB' }}>{p as string}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {[['Positive', '#16A34A'], ['Meeting request', '#16A34A'], ['Pricing → human', '#E08C1F'], ['Not interested', '#E5484D'], ['Wants info', '#2563EB'], ['Partnership', '#A435E8']].map(([l, c]) => (
        <span key={l} className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: `${c}18`, color: c as string }}>{l}</span>
      ))}
    </div>
  );
}

/* ── HOW IT WORKS ─────────────────────────────────────────── */
function HowItWorks() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="How it works" title="Set it up once. It hunts every day." />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="relative overflow-hidden rounded-2xl border border-[#ECEAF1] bg-[#FBFAFD] p-6">
              <span className="text-[14px] font-black tracking-widest text-grad-ink">{s.n}</span>
              <h3 className="mt-3 text-[17px] font-extrabold tracking-tight text-[#16121F]">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6A6478]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── OUTCOMES ─────────────────────────────────────────────── */
function Outcomes() {
  return (
    <section className="px-5 py-6">
      <div className="mx-auto grid max-w-6xl gap-6 overflow-hidden rounded-3xl px-8 py-14 text-center text-white sm:grid-cols-4" style={{ background: 'linear-gradient(135deg,#171022,#2a1240)' }}>
        {[['100×', 'more outreach, zero extra headcount'], ['24/7', 'the agent never stops prospecting'], ['3·7·21', 'day follow-ups, sent automatically'], ['<60s', 'to prep for any sales call']].map(([a, b]) => (
          <div key={b}>
            <div className="text-[40px] font-black tracking-tight md:text-[48px]" style={{ fontFamily: 'var(--font-mono)' }}>{a}</div>
            <div className="mt-1 text-[13.5px] text-white/55">{b}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── TESTIMONIALS ─────────────────────────────────────────── */
function Testimonials() {
  return (
    <section className="bg-[#FBFAFD] py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="Loved by operators" title="Pipelines that follow themselves up" />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-[#ECEAF1] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(20,18,28,.08)]">
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
  );
}

/* ── PRICING TEASER ───────────────────────────────────────── */
function PricingTeaser() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="Simple pricing" title="Start free. Scale when it works." sub="Monthly or a one-time lifetime deal. Bring your own AI key — pay model costs at cost, never marked up." />
        <div className="mt-14 grid items-start gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`relative rounded-2xl border p-6 ${t.highlight ? 'border-transparent text-white' : 'border-[#ECEAF1] bg-white'}`}
              style={t.highlight ? { background: 'linear-gradient(135deg,#171022,#2a1240)', boxShadow: '0 30px 70px rgba(164,53,232,.22)' } : undefined}>
              {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 6px 16px rgba(164,53,232,.4)' }}>{t.badge}</span>}
              <div className={`text-[15px] font-extrabold ${t.highlight ? 'text-white' : 'text-[#16121F]'}`}>{t.name}</div>
              <div className="mt-3 flex items-end gap-1">
                <span className={`text-[40px] font-black tracking-tight ${t.highlight ? 'text-white' : 'text-[#16121F]'}`} style={{ fontFamily: 'var(--font-mono)' }}>${t.monthly}</span>
                <span className={`pb-2 text-[13px] ${t.highlight ? 'text-white/50' : 'text-[#9C97A8]'}`}>/mo</span>
              </div>
              <p className={`mt-0.5 text-[12.5px] ${t.highlight ? 'text-white/50' : 'text-[#9C97A8]'}`}>or ${t.lifetime} once — lifetime</p>
              <Link href="/pricing" className={`mt-5 block rounded-xl py-2.5 text-center text-[14px] font-bold transition ${t.highlight ? 'bg-white text-[#16121F] hover:bg-white/90' : 'text-white hover:-translate-y-0.5'}`}
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
        <div className="mt-8 text-center"><Link href="/pricing" className="text-[14px] font-bold text-[#A435E8] hover:underline">Compare all plans &amp; lifetime deals →</Link></div>
      </div>
    </section>
  );
}

/* ── FINAL CTA ────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="px-5 pb-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] px-8 py-16 text-center text-white aurora">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full anim-glow" style={{ background: 'radial-gradient(circle, rgba(164,53,232,.55), transparent 60%)' }} />
        <h2 className="relative mx-auto max-w-2xl text-[32px] font-black leading-tight tracking-tight md:text-[46px]">Your competitors are still following up by hand.</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-[16px] text-white/65">Set up your first project in minutes. Wake up to a pipeline that filled itself overnight.</p>
        <AuthCta className="relative mt-8 inline-flex items-center gap-2 rounded-[14px] px-8 py-4 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 10px 34px rgba(164,53,232,.5)' }}>
          Start free — no card <ArrowRight size={17} />
        </AuthCta>
      </div>
    </section>
  );
}

/* ── shared ───────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-[13px] font-bold uppercase tracking-wider text-[#A435E8]">{eyebrow}</div>
      <h2 className="mt-3 text-[30px] font-black leading-tight tracking-tight text-[#16121F] md:text-[42px]">{title}</h2>
      {sub && <p className="mt-4 text-[16px] leading-relaxed text-[#6A6478]">{sub}</p>}
    </div>
  );
}
