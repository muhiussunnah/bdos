'use client';

import { useEffect, useRef, useState } from 'react';
import { History, X } from 'lucide-react';

const KEY = 'klientic.recentSubjects';
const MAX = 3;

export function readRecentSubjects(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []; }
  catch { return []; }
}

/** Remember a subject line after a successful send (most recent first, last 3, no duplicates). */
export function rememberSubject(subject: string) {
  const s = subject.trim();
  if (!s) return;
  try {
    const next = [s, ...readRecentSubjects().filter((x) => x.toLowerCase() !== s.toLowerCase())].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

/** Subject field that offers the last 3 subjects you used when focused. */
export function SubjectInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => { setRecent(readRecentSubjects()); }, []);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function remove(s: string) {
    const next = recent.filter((x) => x !== s);
    setRecent(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  return (
    <div ref={wrap} className="relative">
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => { setRecent(readRecentSubjects()); setOpen(true); }} onClick={() => setOpen(true)} />
      {open && recent.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-faint"><History size={11} /> Recently used</div>
          {recent.map((s) => (
            <div key={s} className="flex items-center gap-2 border-t border-line px-1 hover:bg-surface-2">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(s); setOpen(false); }}
                className="min-w-0 flex-1 truncate px-2 py-2 text-left text-[13px] text-ink">{s}</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => remove(s)} aria-label="Forget this subject"
                className="mr-1 grid h-6 w-6 place-items-center rounded text-faint hover:text-bad"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
