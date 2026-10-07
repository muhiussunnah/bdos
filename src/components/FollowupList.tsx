'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Repeat, Loader2, Sparkles, Phone, Mail, Check, ClipboardList, AlertCircle, Clock, CalendarDays, ListFilter } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Avatar } from '@/components/ui';
import { ThreeDot, type MenuItem } from '@/components/Menu';
import { OwnerBadge, useLeadLog } from '@/components/sales/CallFlow';
import { stageLabel } from '@/lib/pipeline';
import { decisionMaker, nextLabel, lastActionLabel, callState, dueOf, leadData, DUE_COLOR, DUE_SOFT, type Due } from '@/lib/sales';
import type { Lead } from '@/lib/types';

type Bucket = 'all' | 'overdue' | 'today' | 'upcoming';
const ORDER: Record<Due, number> = { overdue: 0, today: 1, upcoming: 2, none: 3 };

/**
 * The daily work queue. Shared by the Inbox "Follow-up" stage and /app/followups.
 * Overdue → Today → Upcoming, each row: who, how to reach them, what happened last, what is next.
 */
export function FollowupList({ leads, q, onOpen, onWrite, onChange, showRunAll = true, menuFor }: {
  leads: Lead[]; q: string; onOpen: (l: Lead) => void; onWrite: (l: Lead) => void; onChange: () => void; showRunAll?: boolean;
  menuFor?: (leadId: string) => MenuItem[];
}) {
  const { project } = useApp();
  const log = useLeadLog(onChange);
  const [running, setRunning] = useState(false);
  const [bucket, setBucket] = useState<Bucket>('all');
  const now = new Date();

  const filtered = useMemo(() => leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email} ${l.phone || ''} ${l.role || ''}`.toLowerCase().includes(q.toLowerCase())), [leads, q]);
  const counts = useMemo(() => {
    const c = { overdue: 0, today: 0, upcoming: 0 };
    filtered.forEach((l) => { const d = dueOf(l.next_action_at, now); if (d !== 'none') c[d]++; });
    return c;
  }, [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => {
    const list = bucket === 'all' ? filtered : filtered.filter((l) => dueOf(l.next_action_at, now) === bucket);
    return [...list].sort((a, b) => {
      const da = dueOf(a.next_action_at, now), db = dueOf(b.next_action_at, now);
      if (ORDER[da] !== ORDER[db]) return ORDER[da] - ORDER[db];
      return new Date(a.next_action_at || 0).getTime() - new Date(b.next_action_at || 0).getTime();
    });
  }, [filtered, bucket]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = filtered.filter((l) => l.next_action_at && new Date(l.next_action_at).getTime() <= now.getTime());

  async function runAll() {
    if (!project) return; setRunning(true);
    try {
      const res = await fetch('/api/followups/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(data.processed ? `Sent ${data.processed} follow-ups` : (data.message || 'No follow-ups due right now'));
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setRunning(false); }
  }

  const chips: { key: Bucket; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'overdue', label: 'Overdue', count: counts.overdue, icon: <AlertCircle size={13} />, color: 'var(--red)' },
    { key: 'today', label: 'Today', count: counts.today, icon: <Clock size={13} />, color: 'var(--amber)' },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming, icon: <CalendarDays size={13} />, color: 'var(--dim)' },
    { key: 'all', label: 'All', count: filtered.length, icon: <ListFilter size={13} />, color: 'var(--dim)' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button key={c.key} onClick={() => setBucket(c.key)}
            className={`inline-flex items-center gap-1.5 rounded-[11px] border px-3 py-1.5 text-[12.5px] font-bold transition ${bucket === c.key ? 'border-accent bg-[var(--accent-soft)] text-ink' : 'border-line bg-surface text-dim hover:border-line-2'}`}>
            <span style={{ color: c.color }}>{c.icon}</span>{c.label}
            <span className="rounded-md px-1.5 text-[11px]" style={{ background: c.key === 'today' ? 'var(--amber-soft)' : c.key === 'overdue' ? 'var(--red-soft)' : 'var(--border)', color: c.color }}>{c.count}</span>
          </button>
        ))}
        {showRunAll && (
          <div className="ml-auto flex items-center gap-2 text-[12.5px] text-dim">
            <Repeat size={14} className="text-accent" /><b className="text-ink">{due.length}</b> due now
            <button onClick={runAll} disabled={running || !due.length} className="btn btn-accent btn-sm">
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Run all due follow-ups
            </button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={<Repeat size={38} />} title={q ? 'No matches' : bucket === 'all' ? 'No follow-ups pending' : `Nothing ${bucket}`}
          sub={bucket === 'overdue' ? 'Nothing slipped — nice.' : 'Leads you have tried get a scheduled next action and show up here.'} /></Card>
      ) : (
        <Card className="!p-0">
          {visible.map((l, i) => (
            <FollowupRow key={l.id} lead={l} index={i} onOpen={onOpen} onWrite={onWrite} onChange={onChange} onCall={() => log.startCall(l)}
              menu={[...log.items(l, true), ...(menuFor ? menuFor(l.id) : [])]} />
          ))}
        </Card>
      )}
      {log.modals}
    </div>
  );
}

function FollowupRow({ lead, index, onOpen, onWrite, onChange, onCall, menu }: {
  lead: Lead; index: number; onOpen: (l: Lead) => void; onWrite: (l: Lead) => void; onChange: () => void; onCall: () => void; menu: MenuItem[];
}) {
  const dm = decisionMaker(lead);
  const next = nextLabel(lead);
  const last = lastActionLabel(lead);
  const state = callState(lead);
  const d = leadData(lead);
  const tel = lead.phone ? lead.phone.replace(/[^\d+]/g, '') : '';
  const calledToday = d.last_action && new Date(d.last_action.at).toDateString() === new Date().toDateString();
  const bar = calledToday ? 'var(--green)' : next.due === 'none' ? 'var(--border)' : DUE_COLOR[next.due];

  return (
    <div className="reveal flex flex-wrap items-center gap-3 border-t border-line p-3.5 transition first:border-t-0 hover:bg-surface-2" style={{ animationDelay: `${Math.min(index, 12) * 30}ms`, boxShadow: `inset 4px 0 0 ${bar}` }}>
      <Avatar name={lead.company_name} size={38} />
      <button onClick={() => onOpen(lead)} className="min-w-[200px] flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold text-ink">{lead.company_name}</span>
          <span className={`stagetag s-${lead.stage} flex-none`}>{stageLabel(lead.stage)}</span>
        </div>
        <div className={`truncate text-[12.5px] ${dm ? 'font-semibold text-ink' : 'italic text-faint'}`}>{dm ? `👤 ${dm}` : 'No decision maker yet'}</div>
        {last && <div className="truncate text-[11.5px] text-dim" title={last}>Last: {last}</div>}
      </button>

      <div className="hidden w-52 flex-col gap-0.5 text-[12px] md:flex">
        {lead.email ? <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 truncate text-faint hover:text-accent"><Mail size={11} /> {lead.email}</a> : <span className="inline-flex items-center gap-1.5 text-faint"><Mail size={11} /> no email</span>}
        {lead.phone ? <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-accent"><Phone size={11} /> {lead.phone}</a> : <span className="inline-flex items-center gap-1.5 text-faint"><Phone size={11} /> no phone</span>}
      </div>

      <div className="w-40">
        {next.text
          ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: DUE_SOFT[next.due], color: DUE_COLOR[next.due] }}>{next.text}</span>
          : <span className="text-[11.5px] text-faint">No date — set one</span>}
        {calledToday && <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--green)' }}><Check size={11} /> Done today</div>}
      </div>

      <OwnerBadge lead={lead} onChange={onChange} />
      <div className="flex items-center gap-1.5">
        <button onClick={onCall} title={lead.phone ? `Call ${lead.phone} and log it` : 'Log a call'}
          className={`btn btn-sm ${state === 'pending' ? 'btn-ghost !border-[var(--amber)] !bg-[var(--amber-soft)] !text-[var(--amber)]' : 'text-white'}`}
          style={state === 'pending' ? undefined : { background: 'var(--green)' }}>
          {state === 'pending' ? <ClipboardList size={13} /> : <Phone size={13} />} {state === 'pending' ? 'Log result' : 'Call'}
        </button>
        <button onClick={() => onWrite(lead)} disabled={!lead.email} className="btn btn-ghost btn-sm"><Mail size={13} /> Email</button>
        <ThreeDot items={menu} />
      </div>
    </div>
  );
}
