'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from its previous value to the new one (eased, ~0.7s). */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (reduceMotion() || from === to) { setShown(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown.toLocaleString()}</>;
}

/**
 * One numbered stage tile ("4 Meeting booked · 10 · In calendar") used on the
 * dashboard (links to the leads list) and in the inbox (switches the stage).
 * `index` staggers the entrance; `sub` adds a second line of context.
 */
export function PipelineTile({ n, label, hint, count, emoji, icon, color, active, href, onClick, className, index = 0, sub, size = 'md' }: {
  n: number; label: string; hint: string; count: number;
  emoji?: string; icon?: React.ReactNode; color?: string;
  active?: boolean; href?: string; onClick?: () => void; className?: string;
  index?: number; sub?: React.ReactNode; size?: 'md' | 'lg';
}) {
  const style = { '--tc': color || 'var(--accent)', animationDelay: `${index * 55}ms` } as React.CSSProperties;
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span className="ico" aria-hidden>{emoji || icon}</span>
        <span className="min-w-0 text-[12.5px] font-extrabold leading-[1.15] text-ink"><span className="n">{n}</span>{label}</span>
        <ArrowRight size={15} className="go" aria-hidden />
      </div>
      <div className="num text-ink"><CountUp value={count} /></div>
      <div className="hint" title={hint}>{hint}</div>
      {sub && <div className="sub">{sub}</div>}
      <span className="bar" aria-hidden />
    </>
  );
  const cls = cn('ptile reveal', active && 'is-active', size === 'lg' && 'ptile-lg', className);
  if (href) return <Link href={href} className={cls} style={style} title={`Open ${label} leads`}>{body}</Link>;
  return <button type="button" onClick={onClick} className={cls} style={style} aria-pressed={active}>{body}</button>;
}

/** Stacked distribution bar: how the leads split across the stages, with a legend. */
export function StageBar({ segments, className }: { segments: { key: string; label: string; count: number; color: string }[]; className?: string }) {
  const sum = segments.reduce((a, s) => a + s.count, 0);
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  const pct = (c: number) => (sum ? (c / sum) * 100 : 0);
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full" style={{ background: 'var(--border)' }} role="img" aria-label="Lead distribution across stages">
        {segments.map((s) => (
          <div key={s.key} title={`${s.label}: ${s.count} (${Math.round(pct(s.count))}%)`} className="h-full transition-[width] duration-700 ease-out"
            style={{ width: on ? `${pct(s.count)}%` : '0%', background: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-dim">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label} <b className="text-ink">{Math.round(pct(s.count))}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
