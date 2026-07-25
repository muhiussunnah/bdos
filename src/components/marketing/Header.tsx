'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { MKT_NAV } from '@/lib/marketing';
import { Logo } from '@/components/Logo';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[#ECEAF1] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/"><Logo size={34} /></Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {MKT_NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#6A6478] transition hover:bg-[#F4F3F7] hover:text-[#16121F]">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/login" className="rounded-[11px] px-4 py-2 text-[14px] font-bold text-[#16121F] transition hover:bg-[#F4F3F7]">Log in</Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-[11px] px-4 py-2.5 text-[14px] font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 4px 14px rgba(164,53,232,.32)' }}>
            Start free <ArrowRight size={15} />
          </Link>
        </div>

        <button onClick={() => setOpen((v) => !v)} className="ml-auto grid h-10 w-10 place-items-center rounded-lg border border-[#ECEAF1] text-[#16121F] md:hidden">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#ECEAF1] bg-white px-5 py-3 md:hidden">
          {MKT_NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[15px] font-semibold text-[#16121F]">{n.label}</Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-[#ECEAF1] pt-3">
            <Link href="/login" className="flex-1 rounded-[11px] border border-[#ECEAF1] py-2.5 text-center text-[14px] font-bold text-[#16121F]">Log in</Link>
            <Link href="/login" className="flex-1 rounded-[11px] py-2.5 text-center text-[14px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>Start free</Link>
          </div>
        </div>
      )}
    </header>
  );
}
