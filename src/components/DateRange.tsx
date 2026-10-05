'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import { RANGES, ALL_TIME, isRangeKey, type DateFilter } from '@/lib/threads';

/**
 * Date-range picker used by every list: All time / Last 7 days / Last 30 days /
 * This year / Last year / Custom (from–to). The choice is remembered per list.
 */
export function useDateFilter(name: string): [DateFilter, (f: DateFilter) => void] {
  const [value, setValue] = useState<DateFilter>(ALL_TIME);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`klientic.range.${name}`);
      if (!raw) return;
      if (isRangeKey(raw)) { setValue({ key: raw }); return; } // older format: bare key
      const parsed = JSON.parse(raw) as DateFilter;
      if (parsed && isRangeKey(parsed.key)) setValue({ key: parsed.key, from: parsed.from || undefined, to: parsed.to || undefined });
    } catch { /* ignore */ }
  }, [name]);
  const set = (f: DateFilter) => { setValue(f); try { localStorage.setItem(`klientic.range.${name}`, JSON.stringify(f)); } catch { /* ignore */ } };
  return [value, set];
}

export function DateRangeSelect({ value, onChange, label = 'Date range' }: { value: DateFilter; onChange: (f: DateFilter) => void; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded-[11px] border border-line bg-surface px-2.5 py-1.5">
        <CalendarDays size={14} className="text-faint" />
        <select className="bg-transparent text-[12.5px] font-semibold text-ink outline-none" value={value.key} aria-label={label}
          onChange={(e) => { const key = e.target.value as DateFilter['key']; onChange(key === 'custom' ? { key, from: value.from, to: value.to } : { key }); }}>
          {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </div>
      {value.key === 'custom' && (
        <div className="flex items-center gap-1 rounded-[11px] border border-line bg-surface px-2 py-1 text-[12.5px] text-dim">
          <input type="date" value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} aria-label="From date"
            className="bg-transparent font-semibold text-ink outline-none" />
          <span>→</span>
          <input type="date" value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} aria-label="To date"
            className="bg-transparent font-semibold text-ink outline-none" />
        </div>
      )}
    </div>
  );
}

/** "Export CSV · 123" — exports exactly the filtered list. */
export function ExportButton({ count, onClick, noun = 'rows' }: { count: number; onClick: () => void; noun?: string }) {
  return (
    <button onClick={onClick} disabled={!count} className="btn btn-ghost" title={count ? `Download ${count} ${noun} as CSV (current filters)` : 'Nothing to export'}>
      <Download size={15} /> <span className="hidden sm:inline">Export</span> <span className="rounded-md bg-surface-2 px-1.5 text-[11px] font-bold text-dim">{count}</span>
    </button>
  );
}
