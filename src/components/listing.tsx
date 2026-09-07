'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, X, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
 * Shared list plumbing: pagination, row selection, bulk bar, sorting, confirm.
 * Everything is client-side over already-loaded rows (lists here are ≤ a few
 * thousand items), so it stays instant and needs no extra API calls.
 * ──────────────────────────────────────────────────────────────────────────── */

export const PAGE_SIZES = [10, 25, 50, 100] as const;

function readPageSize(key: string, fallback: number) {
  try { const v = Number(localStorage.getItem(`klientic.pageSize.${key}`)); return PAGE_SIZES.includes(v as 10) ? v : fallback; }
  catch { return fallback; }
}

/** Paginate an in-memory array. Remembers the page size per list. */
export function usePager<T>(items: T[], key: string, defaultSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState(defaultSize);
  useEffect(() => { setSize(readPageSize(key, defaultSize)); }, [key, defaultSize]);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);

  const slice = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  const setPageSize = useCallback((n: number) => {
    setSize(n); setPage(1);
    try { localStorage.setItem(`klientic.pageSize.${key}`, String(n)); } catch { /* ignore */ }
  }, [key]);

  return { page, pages, pageSize, total, slice, setPage, setPageSize, reset: () => setPage(1) };
}

function pageWindow(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const lo = Math.max(2, page - 1), hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push('…');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 1) out.push('…');
  out.push(pages);
  return out;
}

export function Pagination({ page, pages, pageSize, total, onPage, onPageSize, noun = 'items' }: {
  page: number; pages: number; pageSize: number; total: number;
  onPage: (p: number) => void; onPageSize: (n: number) => void; noun?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1, to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 text-[12.5px] text-dim">
      <div className="flex items-center gap-2">
        <span>Show</span>
        <select className="input !w-auto !py-1 !text-[12.5px]" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>per page</span>
      </div>
      <span className="text-faint">·</span>
      <span><b className="text-ink">{from}–{to}</b> of <b className="text-ink">{total}</b> {noun}</span>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn btn-ghost btn-sm !px-2" aria-label="Previous page"><ChevronLeft size={14} /> Prev</button>
        {pageWindow(page, pages).map((p, i) => p === '…' ? (
          <span key={`e${i}`} className="px-1 text-faint">…</span>
        ) : (
          <button key={p} onClick={() => onPage(p)}
            className={cn('h-8 min-w-8 rounded-lg px-2 text-[12.5px] font-bold transition', p === page ? 'bg-ink text-bg' : 'text-dim hover:bg-surface-2')}>{p}</button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="btn btn-ghost btn-sm !px-2" aria-label="Next page">Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

/** Checkbox selection over row ids. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = useCallback((id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const setMany = useCallback((ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => on ? n.add(id) : n.delete(id)); return n; }), []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const allOf = useCallback((ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id)), [selected]);
  const someOf = useCallback((ids: string[]) => ids.some((id) => selected.has(id)), [selected]);
  return { selected, toggle, setMany, clear, allOf, someOf, count: selected.size, has: (id: string) => selected.has(id) };
}

export function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <input type="checkbox" aria-label={label || 'Select'} checked={checked}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }}
      onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer accent-[var(--accent)]" />
  );
}

/** Select-all control for the current page, with a "select all N" escalation. */
export function SelectAll({ pageIds, allIds, sel, noun = 'items' }: { pageIds: string[]; allIds: string[]; sel: ReturnType<typeof useSelection>; noun?: string }) {
  const allPage = sel.allOf(pageIds);
  const allEverything = allIds.length > 0 && sel.allOf(allIds);
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-dim">
      <Checkbox checked={allPage} indeterminate={!allPage && sel.someOf(pageIds)} onChange={(v) => sel.setMany(pageIds, v)} label="Select all on this page" />
      {sel.count > 0 ? (
        <>
          <span><b className="text-ink">{sel.count}</b> selected</span>
          {!allEverything && allIds.length > pageIds.length && (
            <button onClick={() => sel.setMany(allIds, true)} className="font-bold text-accent hover:underline">Select all {allIds.length} {noun}</button>
          )}
          <button onClick={sel.clear} className="font-bold text-dim hover:underline">Clear</button>
        </>
      ) : <span>Select all on page</span>}
    </div>
  );
}

/** Sticky action bar shown while rows are selected. */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl border border-line bg-ink px-4 py-2.5 text-bg shadow-pop">
      <span className="text-[13px] font-bold">{count} selected</span>
      <span className="mx-1 h-5 w-px bg-white/20" />
      {children}
      <button onClick={onClear} className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-bg/70 hover:bg-white/10" aria-label="Clear selection"><X size={15} /></button>
    </div>
  );
}

/** Small themed confirm dialog (replaces window.confirm). */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Delete', danger = true, busy, onCancel, onConfirm }: {
  open: boolean; title: string; body?: React.ReactNode; confirmLabel?: string; danger?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onCancel} title={title}>
      <div className="flex gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: danger ? 'var(--red-soft)' : 'var(--amber-soft)', color: danger ? 'var(--red)' : 'var(--amber)' }}><AlertTriangle size={18} /></span>
        <div className="text-[13.5px] leading-relaxed text-dim">{body}</div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} disabled={busy} className="btn btn-ghost">Cancel</button>
        <button onClick={onConfirm} disabled={busy} className={cn('btn', danger ? 'text-white' : 'btn-primary')} style={danger ? { background: 'var(--red)' } : undefined}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ── sorting ───────────────────────────────────────────────────────────────── */

export type SortDir = 'asc' | 'desc';
export interface SortState<K extends string> { key: K; dir: SortDir }

export function useSort<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const toggle = useCallback((key: K, defaultDir: SortDir = 'asc') =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultDir }), []);
  return { sort, setSort, toggle };
}

export function sortBy<T>(items: T[], pick: (t: T) => string | number | null | undefined, dir: SortDir): T[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = pick(a), vb = pick(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * m;
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base', numeric: true }) * m;
  });
}

export function SortTh<K extends string>({ label, k, sort, onToggle, defaultDir, className }: {
  label: string; k: K; sort: SortState<K>; onToggle: (k: K, d?: SortDir) => void; defaultDir?: SortDir; className?: string;
}) {
  const active = sort.key === k;
  return (
    <th className={cn('th', className)}>
      <button onClick={() => onToggle(k, defaultDir)} className={cn('inline-flex items-center gap-1 uppercase tracking-[.08em] transition hover:text-ink', active && 'text-ink')}>
        {label}
        {active ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-50" />}
      </button>
    </th>
  );
}
