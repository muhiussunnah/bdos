'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MenuItem = { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean };

/**
 * Three-dot menu. The popover is rendered in a portal on <body> with fixed
 * positioning, so it can never be clipped or covered by neighbouring cards /
 * rows (which create their own stacking contexts through animations and
 * transforms). Flips upwards when there is no room below.
 */
export function ThreeDot({ items, label = 'More actions', className }: { items: MenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={btnRef} type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label={label} aria-haspopup="menu" aria-expanded={open}
        className={cn('grid h-8 w-8 flex-none place-items-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-ink', open && 'bg-surface-2 text-ink', className)}>
        <MoreVertical size={16} />
      </button>
      {open && <MenuPopover anchor={btnRef.current} items={items} onClose={() => setOpen(false)} />}
    </>
  );
}

const WIDTH = 240;

/** Same popover with your own trigger (e.g. an owner badge). */
export function AnchoredMenu({ anchor, items, open, onClose }: { anchor: HTMLElement | null; items: MenuItem[]; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <MenuPopover anchor={anchor} items={items} onClose={onClose} />;
}

function MenuPopover({ anchor, items, onClose }: { anchor: HTMLElement | null; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor || !ref.current) return;
      const r = anchor.getBoundingClientRect();
      const h = ref.current.offsetHeight || items.length * 38 + 8;
      const left = Math.max(8, Math.min(r.right - WIDTH, window.innerWidth - WIDTH - 8));
      let top = r.bottom + 6;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - 6 - h);
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, items.length]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [anchor, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={ref} role="menu" onClick={(e) => e.stopPropagation()}
      className="animate-pop fixed z-[200] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: WIDTH, visibility: pos ? 'visible' : 'hidden' }}>
      {items.map((it) => (
        <button key={it.label} role="menuitem" type="button" onClick={(e) => { e.stopPropagation(); onClose(); it.run(); }}
          className={cn('menu-item flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold', it.danger && 'is-danger')}>
          {it.icon && <span className="menu-ico grid h-4 w-4 place-items-center">{it.icon}</span>}
          <span className="truncate">{it.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
