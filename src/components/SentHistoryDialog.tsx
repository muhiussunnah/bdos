'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, History, Loader2, Send } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { SentRow } from '@/lib/sentHistory';

export interface HistoryTarget {
  email: string;
  label: string;
  leadId?: string | null;
  lastContactedAt?: string | null;
  /** Emails already sent to this address, newest first. */
  rows: SentRow[];
}

export const CONFIRM_RESEND_LABEL = 'Confirm to Start Send New Message';

/**
 * Warns before emailing someone who already got an email from this project and
 * shows everything that went out (click an email to read it). "Confirm to Start
 * Send New Message" is the explicit go-ahead for a fresh offer; Cancel skips them.
 * In `view` mode it is a plain history viewer (same confirm button to pick the lead).
 */
export function SentHistoryDialog({ open, targets, view, onCancel, onConfirm }: {
  open: boolean; targets: HistoryTarget[]; view?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const key = targets.map((t) => t.email).join('|');
  useEffect(() => {
    if (open) setExpanded(new Set(targets.length === 1 ? [targets[0].email] : []));
  }, [open, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const one = targets.length === 1 ? targets[0] : null;
  const oneLast = one?.rows[0];
  const toggle = (email: string) => setExpanded((s) => { const n = new Set(s); if (n.has(email)) n.delete(email); else n.add(email); return n; });

  return (
    <Modal open={open} onClose={onCancel} title={view ? 'Email history' : 'Already emailed'} wide>
      {!view && (
        <div className="flex gap-3 rounded-xl border border-line p-3.5" style={{ background: 'var(--amber-soft)' }}>
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: 'var(--surface)', color: 'var(--amber)' }}><AlertTriangle size={18} /></span>
          <div className="text-[13px] leading-relaxed text-ink">
            {one ? (
              <b>
                You already sent {one.rows.length > 1 ? `${one.rows.length} emails` : 'an email'} to {one.email}
                {' '}({relTime(oneLast?.sent_at || oneLast?.created_at || one.lastContactedAt)}).
              </b>
            ) : (
              <b>{targets.length} of the selected addresses were already emailed from this project.</b>
            )}
            <div className="mt-1 text-dim">
              Same offer again? Cancel and skip {one ? 'it' : 'them'}. A new offer with a new subject and message?
              Check the history below, then confirm.
            </div>
          </div>
        </div>
      )}

      <div className={`${view ? '' : 'mt-3 '}max-h-[52vh] space-y-2 overflow-y-auto pr-1`}>
        {targets.map((t) => {
          const isOpen = expanded.has(t.email);
          const last = t.rows[0];
          return (
            <div key={t.email} className="rounded-xl border border-line bg-surface">
              <button type="button" onClick={() => toggle(t.email)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><History size={14} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink">{t.label}</span>
                  <span className="block truncate text-[11.5px] text-faint">{t.email}</span>
                </span>
                <span className="whitespace-nowrap text-[11.5px] font-semibold text-dim">
                  {t.rows.length ? `${t.rows.length} email${t.rows.length === 1 ? '' : 's'}` : 'Contacted'} · last {relTime(last?.sent_at || last?.created_at || t.lastContactedAt)}
                </span>
                <ChevronDown size={15} className={`flex-none text-faint transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-line">
                  {t.rows.length === 0 && (
                    <div className="px-3.5 py-3 text-[12.5px] text-faint">
                      Contacted {relTime(t.lastContactedAt)}, but the email record was deleted from Outreach, so there is nothing to show.
                    </div>
                  )}
                  {t.rows.map((r) => <SentMessage key={r.id} row={r} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button onClick={onCancel} className="btn btn-ghost">{view ? 'Close' : 'Cancel'}</button>
        <button onClick={onConfirm} className="btn btn-accent"><Send size={15} /> {CONFIRM_RESEND_LABEL}</button>
      </div>
    </Modal>
  );
}

/** One previously sent email; the body loads the first time it is opened. */
function SentMessage({ row }: { row: SentRow }) {
  const { supabase } = useApp();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<{ body: string | null; html: string | null } | null>(null);

  useEffect(() => {
    if (!open || full) return;
    let alive = true;
    supabase.from('messages').select('body, ai_meta').eq('id', row.id).maybeSingle().then(({ data }) => {
      if (!alive) return;
      const d = data as { body?: string | null; ai_meta?: { html?: string } } | null;
      setFull({ body: d?.body ?? null, html: d?.ai_meta?.html || null });
    });
    return () => { alive = false; };
  }, [open, full, row.id, supabase]);

  const when = row.sent_at || row.created_at;
  return (
    <div className="border-t border-line first:border-t-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-ink">{row.subject || '(no subject)'}</span>
          <span className="block truncate text-[11px] text-faint">{row.from_email ? `from ${row.from_email} · ` : ''}{new Date(when).toLocaleString()}</span>
        </span>
        <span className="whitespace-nowrap text-[11px] text-faint">{relTime(when)}</span>
        <ChevronDown size={14} className={`flex-none text-faint transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="bg-surface-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink">
          {!full ? (
            <span className="flex items-center gap-2 text-dim"><Loader2 size={13} className="animate-spin text-accent" /> Loading…</span>
          ) : full.html ? (
            <div className="rte-preview" dangerouslySetInnerHTML={{ __html: full.html }} />
          ) : (
            <div className="whitespace-pre-wrap">{full.body || '(empty)'}</div>
          )}
        </div>
      )}
    </div>
  );
}
