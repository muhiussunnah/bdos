'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stageLabel } from '@/lib/pipeline';

/**
 * Overlays render in a portal on <body>. Inside a card or row that is animated /
 * transformed, `position: fixed` would otherwise be measured against that card
 * and the dialog ends up clipped behind its neighbours.
 */
function usePortalRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => { setRoot(document.body); }, []);
  return root;
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function Metric({ label, value, delta, tone, icon }: {
  label: string; value: string | number; delta?: string; tone?: 'up' | 'down'; icon?: React.ReactNode;
}) {
  return (
    <div className="metric reveal">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dim">
        {icon && <span className="grid h-6 w-6 place-items-center rounded-[7px]" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{icon}</span>}
        {label}
      </div>
      <div className="val text-ink">{value}</div>
      {delta && <div className={cn('mt-0.5 text-[11.5px] font-bold', tone === 'down' ? 'text-bad' : 'text-ok')}>{delta}</div>}
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#A435E8,#E0457E)', 'linear-gradient(135deg,#2563EB,#06B6D4)', 'linear-gradient(135deg,#16A34A,#84CC16)',
  'linear-gradient(135deg,#E08C1F,#F43F5E)', 'linear-gradient(135deg,#7C3AED,#2563EB)', 'linear-gradient(135deg,#DB2777,#F97316)',
];

/** Initials bubble with a stable gradient per name. */
export function Avatar({ name, size = 36, className }: { name?: string | null; size?: number; className?: string }) {
  const s = name || '?';
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const parts = s.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  const ini = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  return (
    <span className={cn('grid flex-none place-items-center rounded-xl font-extrabold text-white', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), background: AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length], boxShadow: '0 2px 8px rgba(20,18,28,.14)' }}>
      {ini}
    </span>
  );
}

export function PriorityTag({ p }: { p: 'A' | 'B' | 'C' }) {
  return <span className={cn('tag', `t-${p}`)}>{p}</span>;
}

export function StageTag({ stage }: { stage: string }) {
  return <span className={cn('stagetag', `s-${stage}`)}>{stageLabel(stage)}</span>;
}

export function Score({ value }: { value: number }) {
  const color = value >= 80 ? 'var(--green)' : value >= 60 ? 'var(--amber)' : 'var(--faint)';
  return (
    <span className="mono inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color }}>
      {value}
    </span>
  );
}

export function EmptyState({ title, sub, icon, action }: {
  title: string; sub?: string; icon?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center text-faint">
      <div className="mb-3 opacity-50">{icon || <Inbox size={38} />}</div>
      <b className="mb-1 block text-[14px] text-dim">{title}</b>
      {sub && <p className="max-w-xs text-[13px]">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 text-[13px] text-dim">
      <Loader2 size={15} className="animate-spin text-accent" />
      {label}
    </div>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 text-[13px] text-dim">
      <span className="dots"><span /><span /><span /></span>
      {label}
    </div>
  );
}

export function Drawer({ open, onClose, title, sub, children, footer }: {
  open: boolean; onClose: () => void; title: string; sub?: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  const root = usePortalRoot();
  if (!root) return null;
  return createPortal(
    <>
      <div className={cn('fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose} />
      <div className={cn('fixed right-0 top-0 z-[101] flex h-full w-[min(560px,100%)] flex-col bg-bg shadow-pop transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-start gap-3.5 border-b border-line bg-surface px-6 py-5">
          <div className="flex-1">
            <div className="text-[17px] font-extrabold tracking-tight text-ink">{title}</div>
            {sub && <div className="mt-0.5 text-[12.5px] text-dim">{sub}</div>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-line"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-6 py-4">{footer}</div>}
      </div>
    </>,
    root,
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  const root = usePortalRoot();
  if (!open || !root) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] bg-surface p-6 shadow-pop',
        wide ? 'max-w-[720px]' : 'max-w-[540px]')}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold tracking-tight text-ink">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-line"><X size={18} /></button>
        </div>
        {children}
      </div>
    </>,
    root,
  );
}
