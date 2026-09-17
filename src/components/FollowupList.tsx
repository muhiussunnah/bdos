'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Repeat, Loader2, Sparkles, Send } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';

/** Shared by the Inbox "Follow-up" stage and the dedicated /app/followups page. */
export function FollowupList({ leads, q, onOpen, onWrite, onChange, showRunAll = true }: {
  leads: Lead[]; q: string; onOpen: (l: Lead) => void; onWrite: (l: Lead) => void; onChange: () => void; showRunAll?: boolean;
}) {
  const { project } = useApp();
  const [running, setRunning] = useState(false);
  const now = Date.now();
  const filtered = leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email}`.toLowerCase().includes(q.toLowerCase()));
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
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 border-t border-line p-4 first:border-t-0">
              <button onClick={() => onOpen(l)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-ink">{l.company_name}</span>
                  <span className="stagetag" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>{l.stage.replace('followup', 'Follow-up ')}</span>
                </div>
                <div className="truncate text-[12px] text-dim">{l.contact_name || l.email}</div>
              </button>
              <div className="text-[12px] text-faint">{l.next_action_at ? (isDue ? <span className="font-bold" style={{ color: 'var(--amber)' }}>Due {relTime(l.next_action_at)}</span> : `Next ${new Date(l.next_action_at).toLocaleDateString()}`) : 'No date'}</div>
              <button onClick={() => onWrite(l)} className="btn btn-ghost btn-sm"><Send size={13} /> Write follow-up</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
