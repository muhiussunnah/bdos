'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { Lead } from '@/lib/types';

/**
 * Type-to-search lead picker (company, contact, email, website) — replaces the
 * unsearchable <select> wherever a lead has to be chosen.
 */
export function LeadPicker({ leads, value, onChange, placeholder = 'Search company, contact or email…', autoFocus }: {
  leads: Lead[]; value: string; onChange: (id: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const chosen = useMemo(() => leads.find((l) => l.id === value) || null, [leads, value]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? leads.filter((l) => `${l.company_name} ${l.contact_name || ''} ${l.email || ''} ${l.website || ''}`.toLowerCase().includes(needle))
      : leads;
    return list.slice(0, 25);
  }, [leads, q]);

  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (chosen) {
    return (
      <div className="flex items-center gap-2.5 rounded-[11px] border border-accent bg-[var(--accent-soft)] px-3 py-2">
        <Avatar name={chosen.company_name} size={26} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-ink">{chosen.company_name}</div>
          <div className="truncate text-[11.5px] text-dim">{[chosen.contact_name, chosen.email].filter(Boolean).join(' · ')}</div>
        </div>
        <button type="button" onClick={() => { onChange(''); setQ(''); setOpen(true); }} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:bg-surface hover:text-ink" aria-label="Clear"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2 focus-within:border-accent">
        <Search size={14} className="text-faint" />
        <input value={q} autoFocus={autoFocus} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(i + 1, matches.length - 1)); setOpen(true); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && open && matches[hi]) { e.preventDefault(); onChange(matches[hi].id); setOpen(false); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder} className="w-full bg-transparent text-[13px] outline-none text-ink" />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-pop">
          {matches.length === 0 && <div className="px-3 py-3 text-center text-[12.5px] text-faint">No leads match “{q}”.</div>}
          {matches.map((l, i) => (
            <button key={l.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(l.id); setOpen(false); }} onMouseEnter={() => setHi(i)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${i === hi ? 'bg-[var(--accent-soft)]' : ''}`}>
              <Avatar name={l.company_name} size={24} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-ink">{l.company_name}</span><span className="block truncate text-[11px] text-faint">{[l.contact_name, l.email].filter(Boolean).join(' · ') || 'no contact'}</span></span>
            </button>
          ))}
          {leads.length > 25 && matches.length === 25 && <div className="px-3 py-1.5 text-[11px] text-faint">Showing 25 — type more to narrow down.</div>}
        </div>
      )}
    </div>
  );
}
