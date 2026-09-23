'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Repeat, Loader2, Sparkles, Send, Phone, Mail, MoreVertical } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';

type MenuItem = { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean };

/** Shared by the Inbox "Follow-up" stage and the dedicated /app/followups page. */
export function FollowupList({ leads, q, onOpen, onWrite, onChange, showRunAll = true, menuFor }: {
  leads: Lead[]; q: string; onOpen: (l: Lead) => void; onWrite: (l: Lead) => void; onChange: () => void; showRunAll?: boolean;
  menuFor?: (leadId: string) => MenuItem[];
}) {
  const { project } = useApp();
  const [running, setRunning] = useState(false);
  const now = Date.now();
  const filtered = leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email} ${l.phone || ''}`.toLowerCase().includes(q.toLowerCase()));
  const due = filtered.filter((l) => l.next_action_at && new Date(l.next_action_at).getTime() <= now);

  async function runAll() {
    if (!project) return; setRunning(true);
    try {
      const res = await fetch('/api/followups/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(data.processed ? `Sent ${data.processed} follow-ups` : (data.message || 'No follow-ups due right now'));
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setRunning(false); }
  }

  if (!filtered.length) return <Card><EmptyState icon={<Repeat size={38} />} title={q ? 'No matches' : 'No follow-ups pending'} sub="Leads you have contacted but who have not replied show up here so you can nudge them." /></Card>;

  return (
    <div className="space-y-3">
      {showRunAll && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3">
          <Repeat size={16} className="text-accent" />
          <span className="text-[13px] text-dim"><b className="text-ink">{due.length}</b> due now · <b className="text-ink">{filtered.length}</b> in sequence</span>
          <button onClick={runAll} disabled={running || !due.length} className="btn btn-accent btn-sm ml-auto">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Run all due follow-ups
          </button>
        </div>
      )}
      <Card className="!p-0">
        {filtered.map((l) => {
          const isDue = l.next_action_at && new Date(l.next_action_at).getTime() <= now;
          const tel = l.phone ? l.phone.replace(/[^\d+]/g, '') : '';
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 border-t border-line p-4 first:border-t-0">
              <button onClick={() => onOpen(l)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-ink">{l.company_name}</span>
                  <span className="stagetag" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>{l.stage.replace('followup', 'Follow-up ')}</span>
                </div>
                <div className="truncate text-[12px] text-dim">{l.contact_name || l.email}</div>
              </button>
              <div className="flex flex-col items-start gap-1 text-[12px]">
                {l.phone ? (
                  <a href={`tel:${tel}`} onClick={(e) => e.stopPropagation()} title="Call — opens your phone dialer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 font-bold text-ink transition hover:border-accent hover:text-accent">
                    <Phone size={12} /> {l.phone}
                  </a>
                ) : <span className="inline-flex items-center gap-1.5 text-faint"><Phone size={12} /> no phone</span>}
                {l.email && <a href={`mailto:${l.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 truncate text-faint hover:text-accent"><Mail size={11} /> {l.email}</a>}
              </div>
              <div className="w-28 text-[12px] text-faint">{l.next_action_at ? (isDue ? <span className="font-bold" style={{ color: 'var(--amber)' }}>Due {relTime(l.next_action_at)}</span> : `Next ${new Date(l.next_action_at).toLocaleDateString()}`) : 'No date'}</div>
              <button onClick={() => onWrite(l)} className="btn btn-ghost btn-sm"><Send size={13} /> Write follow-up</button>
              {menuFor && <RowMenu items={menuFor(l.id)} />}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function RowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="More actions" className="grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-ink"><MoreVertical size={16} /></button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
          {items.map((it) => (
            <button key={it.label} onClick={() => { setOpen(false); it.run(); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition hover:bg-surface-2 ${it.danger ? 'border-t border-line text-bad' : 'text-ink'}`}>{it.icon}{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
