'use client';

import { cn } from '@/lib/utils';

/**
 * Page hero banner. Light mode: white → lavender with dark text; dark mode: deep plum
 * with white text (see .hero in globals.css). Use the helper classes inside:
 *   .hero-dim / .hero-faint  secondary text    .hero-ghost  ghost button
 *   .hero-pill               status pill       .hero-hand   handwritten accent
 */
export function Hero({ children, className, glow = true }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={cn('hero relative overflow-hidden rounded-xl p-6', className)}>
      {children}
      {glow && <div className="hero-glow pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full" />}
    </div>
  );
}
