'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * One numbered stage tile ("4. Meeting booked · 8 · In calendar") used on the
 * dashboard (links to the leads list) and in the inbox (switches the stage).
 */
export function PipelineTile({ n, label, hint, count, emoji, icon, color, active, href, onClick, className }: {
  n: number; label: string; hint: string; count: number;
  emoji?: string; icon?: React.ReactNode; color?: string;
  active?: boolean; href?: string; onClick?: () => void; className?: string;
}) {
  const style = color ? { background: `color-mix(in srgb, ${color} ${active ? 18 : 11}%, var(--surface))` } : { background: 'var(--surface)' };
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span className="ico" style={icon && color ? { color } : undefined}>{emoji || icon}</span>
        <span className="truncate text-[13px] font-extrabold text-ink"><span className="text-dim">{n}.</span> {label}</span>
      </div>
      <div className="num text-ink">{count}</div>
      <div className="hint" title={hint}>{hint}</div>
    </>
  );
  const cls = cn('ptile', active && 'is-active', className);
  if (href) return <Link href={href} className={cls} style={style} title={`Open ${label} leads`}>{body}</Link>;
  return <button type="button" onClick={onClick} className={cls} style={style}>{body}</button>;
}
