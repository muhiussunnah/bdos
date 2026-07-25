import Link from 'next/link';
import { BRAND } from '@/lib/constants';
import { LogoMark } from '@/components/Logo';
import { ShieldCheck, ArrowRight, Facebook, Linkedin, Instagram } from 'lucide-react';
import { InstallButton } from '@/components/marketing/InstallButton';

const PRODUCT: [string, string][] = [
  ['Features', '/features'],
  ['Pricing', '/pricing'],
  ['Blog', '/blog'],
  ['About', '/about'],
];
const COMPANY: [string, string][] = [
  ['Contact', '/contact'],
  ['Log in', '/login'],
  ['Start free', '/login'],
  ['Affiliates', '/login'],
];
const LEGAL: [string, string][] = [
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
];

function XIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'X', href: 'https://x.com', icon: <XIcon /> },
  { label: 'Facebook', href: 'https://facebook.com', icon: <Facebook size={16} /> },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: <Linkedin size={16} /> },
  { label: 'Instagram', href: 'https://instagram.com', icon: <Instagram size={16} /> },
];

/* ── payment marks ───────────────────────────────────────── */
function Pill({ children, bg = '#fff' }: { children: React.ReactNode; bg?: string }) {
  return (
    <span
      className="inline-flex h-[26px] min-w-[42px] items-center justify-center rounded-[6px] px-2"
      style={{ background: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)' }}
    >
      {children}
    </span>
  );
}

function Mastercard() {
  return (
    <span className="relative inline-block h-[15px] w-[24px]">
      <span className="absolute left-0 top-0 h-[15px] w-[15px] rounded-full" style={{ background: '#EB001B' }} />
      <span className="absolute right-0 top-0 h-[15px] w-[15px] rounded-full opacity-90" style={{ background: '#F79E1B' }} />
    </span>
  );
}

function AppleMark() {
  return (
    <svg width="10" height="12" viewBox="0 0 14 17" fill="#fff" aria-hidden>
      <path d="M11.6 9c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6C4.3 5.3 3 6.3 3 8.3c0 1 .4 2 .9 2.7.4.6.9 1.3 1.6 1.3.6 0 .9-.4 1.7-.4s1 .4 1.7.4c.7 0 1.1-.6 1.6-1.3.5-.7.7-1.4.7-1.4s-1.3-.5-1.3-2.1zM9.5 3.9c.4-.5.6-1.1.5-1.8-.6 0-1.2.4-1.6.9-.3.4-.6 1-.5 1.7.6 0 1.2-.3 1.6-.8z" />
    </svg>
  );
}

const PAYMENTS: React.ReactNode[] = [
  <Pill key="visa"><span style={{ color: '#1A1F71', fontStyle: 'italic', fontWeight: 900, fontSize: 11, letterSpacing: '.02em' }}>VISA</span></Pill>,
  <Pill key="mc"><Mastercard /></Pill>,
  <Pill key="amex" bg="#2571C4"><span style={{ color: '#fff', fontWeight: 800, fontSize: 8.5, letterSpacing: '.04em' }}>AMEX</span></Pill>,
  <Pill key="pp"><span style={{ fontStyle: 'italic', fontWeight: 800, fontSize: 10 }}><span style={{ color: '#003087' }}>Pay</span><span style={{ color: '#009CDE' }}>Pal</span></span></Pill>,
  <Pill key="apple" bg="#000"><span className="inline-flex items-center gap-0.5"><AppleMark /><span style={{ color: '#fff', fontWeight: 600, fontSize: 9.5 }}>Pay</span></span></Pill>,
  <Pill key="gpay"><span style={{ fontWeight: 700, fontSize: 10 }}><span style={{ color: '#4285F4' }}>G</span><span style={{ color: '#3C4043' }}> Pay</span></span></Pill>,
  <Pill key="stripe"><span style={{ color: '#635BFF', fontWeight: 800, fontSize: 10 }}>stripe</span></Pill>,
];

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[.12em] text-white/40">{title}</div>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-[13.5px] font-medium text-white/60 transition hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-white/[.06] bg-[#0B0710] text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle,rgba(164,53,232,.35),transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-96 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle,rgba(224,69,126,.32),transparent 70%)' }} />

      <div className="relative mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_.7fr_.7fr_1.35fr]">
          {/* brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Klientic home">
              <LogoMark size={36} />
              <span className="text-[17px] font-black tracking-tight">{BRAND.name}</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/50">
              {BRAND.tagline} The AI business-development operating system for teams that hunt, qualify and close — on autopilot.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <Col title="Product" links={PRODUCT} />
          <Col title="Company" links={COMPANY} />

          {/* secure payment */}
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{ background: 'rgba(124,231,168,.14)' }}>
                <ShieldCheck size={17} className="text-[#7CE7A8]" />
              </span>
              <div>
                <div className="text-[13.5px] font-bold text-white">Guaranteed secure payment</div>
                <div className="text-[11.5px] text-white/45">256-bit SSL · No hidden charges</div>
              </div>
            </div>

            <div className="mt-4 text-[10.5px] font-bold uppercase tracking-[.14em] text-white/35">We accept</div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{PAYMENTS}</div>

            <Link href="/pricing"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 8px 22px rgba(164,53,232,.4)' }}>
              Get started free <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <InstallButton />
      </div>

      {/* bottom bar */}
      <div className="relative border-t border-white/[.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[12.5px] text-white/40 sm:flex-row">
          <span>© {year} {BRAND.name}. All rights reserved.</span>
          <div className="flex items-center gap-5">
            {LEGAL.map(([label, href]) => (
              <Link key={label} href={href} className="transition hover:text-white/80">{label}</Link>
            ))}
            <Link href="/contact" className="transition hover:text-white/80">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
