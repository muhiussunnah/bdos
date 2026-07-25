'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Zap, ArrowRight, X } from 'lucide-react';

export function AnnouncementBar() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem('klientic.promo') === 'off') setShow(false);
    } catch {}
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem('klientic.promo', 'off');
    } catch {}
  }

  return (
    <div className="promo-grad relative z-40 overflow-hidden text-white">
      {/* moving shine */}
      <div className="anim-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
        style={{ background: 'linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent)' }} />

      <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-10 py-2.5 sm:gap-3">
        <span className="relative hidden h-2 w-2 flex-none sm:block">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/80" />
          <span className="absolute inset-0 rounded-full bg-white" />
        </span>

        <span className="inline-flex flex-none items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-[.1em] ring-1 ring-inset ring-white/25 backdrop-blur">
          <Zap size={11} className="fill-white" /> Lifetime deal
        </span>

        <span className="truncate text-[13px] font-semibold text-white/95">
          Pay once, own it forever
          <span className="hidden md:inline"> — lifetime plans never renew</span>.
        </span>

        <Link href="/pricing"
          className="group inline-flex flex-none items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-bold ring-1 ring-inset ring-white/30 backdrop-blur transition hover:bg-white/25 hover:-translate-y-px">
          See pricing <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
        </Link>

        <button onClick={dismiss} aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/70 transition hover:bg-white/20 hover:text-white">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
