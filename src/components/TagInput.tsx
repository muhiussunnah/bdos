'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Chip input: type a value and press Enter or comma to turn it into a chip.
 * Pasting "a, b, c" adds three chips. Backspace on an empty field removes the last one.
 */
export function TagInput({ value, onChange, placeholder, max = 20, className, autoFocus }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; className?: string; autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const parts = raw.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (next.length >= max) break;
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft('');
  }

  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)); ref.current?.focus(); }

  return (
    <div onClick={() => ref.current?.focus()}
      className={cn('input flex min-h-[44px] cursor-text flex-wrap items-center gap-1.5 !py-1.5', className)}>
      {value.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {v}
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(i); }} aria-label={`Remove ${v}`}
            className="grid h-4 w-4 place-items-center rounded hover:bg-black/10"><X size={11} /></button>
        </span>
      ))}
      <input ref={ref} value={draft} autoFocus={autoFocus}
        onChange={(e) => { const v = e.target.value; if (/[,;]/.test(v)) add(v); else setDraft(v); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && value.length) { e.preventDefault(); remove(value.length - 1); }
        }}
        onBlur={() => { if (draft.trim()) add(draft); }}
        onPaste={(e) => { const t = e.clipboardData.getData('text'); if (/[,;\n]/.test(t)) { e.preventDefault(); add(t); } }}
        placeholder={value.length ? (value.length >= max ? '' : 'Add another…') : placeholder}
        className="min-w-[140px] flex-1 bg-transparent py-1 text-[13px] text-ink outline-none placeholder:text-faint" />
    </div>
  );
}
