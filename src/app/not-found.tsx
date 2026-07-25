import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { BRAND } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center text-white"
      style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)' }}>
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-96 -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(164,53,232,.4), transparent 65%)' }} />

      <div className="relative">
        <div className="mb-8 flex items-center justify-center gap-3">
          <LogoMark size={40} />
          <span className="text-[17px] font-black tracking-tight">{BRAND.name}</span>
        </div>

        <div className="text-[110px] font-black leading-none tracking-tight md:text-[150px]"
          style={{ background: 'linear-gradient(135deg,#C77BFF,#FF8FB8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </div>
        <h1 className="mt-2 text-[24px] font-extrabold tracking-tight md:text-[30px]">This page went hunting elsewhere</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/60">
          The page you’re looking for doesn’t exist or has moved. Let’s get you back to your pipeline.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex items-center gap-2 rounded-[13px] px-6 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 10px 30px rgba(164,53,232,.45)' }}>
            <Home size={17} /> Back to home
          </Link>
          <Link href="/app/dashboard" className="inline-flex items-center gap-2 rounded-[13px] border border-white/15 bg-white/5 px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-white/10">
            <ArrowLeft size={17} /> Go to dashboard
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 text-[13px] text-white/35">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
    </div>
  );
}
