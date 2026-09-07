'use client';

import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { useViewer } from '@/components/marketing/Header';

/**
 * A "Start free" call-to-action that turns into "Go to dashboard" for a
 * signed-in visitor. Keeps the caller's className/style so the design stays
 * identical in both states.
 */
export function AuthCta({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const { me } = useViewer();
  if (me) {
    return (
      <Link href="/app/dashboard" className={className} style={style}>
        <LayoutDashboard size={17} /> Go to your dashboard <ArrowRight size={17} />
      </Link>
    );
  }
  return <Link href="/login" className={className} style={style}>{children}</Link>;
}
