'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ListChecks, RefreshCw, Check, Phone, Mail, Clock, Loader2, Sparkles, AlertCircle, CalendarDays, ClipboardList } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, PriorityTag, Thinking, Avatar } from '@/components/ui';
import { CallResultModal } from '@/components/sales/CallFlow';
import { dueOf, DUE_COLOR, DUE_SOFT, type Due } from '@/lib/sales';
import type { Task, Lead } from '@/lib/types';

const TYPE_ICON: Record<string, React.ReactNode> = {
  call: <Phone size={14} />, email: <Mail size={14} />, followup: <Clock size={14} />, review: <Sparkles size={14} />,
};
const PRIO_LABEL: Record<string, string> = { A: 'Call today', B: 'Within 48h', C: 'Email first' };
const BUCKETS: { key: Due; label: string; icon: React.ReactNode }[] = [
  { key: 'overdue', label: 'Overdue', icon: <AlertCircle size={14} /> },
  { key: 'today', label: 'Today', icon: <Clock size={14} /> },
  { key: 'upcoming', label: 'Upcoming', icon: <CalendarDays size={14} /> },
  { key: 'none', label: 'No date', icon: <ListChecks size={14} /> },
];

/**
 * Today's tasks. Call tasks created by the call flow (next call on a lead) are
 * grouped Overdue → Today → Upcoming; the agent-built list sits alongside.
 */
export default function TasksPage() {
  const { project, user, supabase, refreshCounts } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [resultFor, setResultFor] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('tasks').select('*').eq('project_id', project.id).eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).order('priority');
    const list = (data as Task[]) || [];
    setTasks(list);
    const ids = [...new Set(list.map((t) => t.lead_id).filter((x): x is string => !!x))];
    const map: Record<string, Lead> = {};
    for (let i = 0; i < ids.length; i += 200) {
      const { data: ld } = await supabase.from('leads').select('*').in('id', ids.slice(i, i + 200));
      ((ld as Lead[]) || []).forEach((l) => { map[l.id] = l; });
    }
    setLeads(map);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  async function build() {
    if (!project) return;
    setBuilding(true);
    // wipe the agent's auto tasks, keep call tasks the salesperson scheduled (no suggested opening on those)
    await supabase.from('tasks').delete().eq('project_id', project.id).eq('status', 'open').or('type.neq.call,suggested_opening.not.is.null');
    const { data: leadsRaw } = await supabase.from('leads').select('*').eq('project_id', project.id);
    const all = (leadsRaw as Lead[]) || [];
    const now = new Date().toISOString();
    const base = (l: Lead) => ({ project_id: project.id, owner_id: user.id, lead_id: l.id });
    const scheduled = new Set(tasks.filter((t) => t.type === 'call' && !t.suggested_opening).map((t) => t.lead_id));
    const rows: Partial<Task>[] = [];
    for (const l of all) {
      if (rows.length >= 25) break;
      if (scheduled.has(l.id)) continue;
      if (['positive', 'meeting'].includes(l.stage)) {
        rows.push({ ...base(l), type: 'call', priority: 'A', title: `Call ${l.company_name}`, reason: l.reason || 'Positive reply — book a meeting before it cools.', suggested_opening: `Hi ${l.contact_name || 'there'}, thanks for getting back — great to hear the interest.`, suggested_next_step: 'Propose two concrete meeting times.' });
      } else if (l.next_action_at && l.next_action_at <= now && ['contacted', 'followup1', 'followup2'].includes(l.stage)) {
        rows.push({ ...base(l), type: 'followup', priority: 'B', title: `Follow up: ${l.company_name}`, reason: 'Scheduled follow-up is due (no reply yet).', suggested_next_step: 'Send a short, friendly nudge with a new angle.', due_at: l.next_action_at });
      } else if (l.stage === 'new' && l.priority === 'A') {
        rows.push({ ...base(l), type: 'email', priority: 'C', title: `Reach out: ${l.company_name}`, reason: l.reason || 'High-fit new lead — open the conversation.', suggested_next_step: 'Send a personal first outreach.' });
      }
    }
    if (rows.length) await supabase.from('tasks').insert(rows);
    setBuilding(false);
    toast.success(`${rows.length} tasks added to the list`);
    load(); refreshCounts();
  }

  async function done(id: string) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', id);
    load(); refreshCounts();
  }

  const grouped = useMemo(() => {
    const now = new Date();
    return BUCKETS.map((b) => ({ ...b, items: tasks.filter((t) => dueOf(t.due_at, now) === b.key) })).filter((g) => g.items.length > 0);
  }, [tasks]);

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-dim">Calls you scheduled from the cards land here on their day. Rebuild adds the agent&rsquo;s suggestions (A = call today · B = within 48h · C = email first).</p>
        <button onClick={build} disabled={building} className="btn btn-accent">{building ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Rebuild list</button>
      </div>

      {loading ? <Thinking label="Loading tasks…" /> : tasks.length === 0 ? (
        <Card><EmptyState icon={<ListChecks size={38} />} title="Nothing on the list" sub="Log a call result with “Call again” or “No answer” and the next call appears here on its day. Or build the agent's list."
          action={<button onClick={build} className="btn btn-accent"><RefreshCw size={15} /> Build today's list</button>} /></Card>
      ) : (
        grouped.map((g) => (
          <div key={g.key}>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: DUE_COLOR[g.key] }}>{g.icon}{g.label}<span className="text-faint">· {g.items.length}</span></div>
            <Card className="!p-0">
              {g.items.map((t) => {
                const lead = t.lead_id ? leads[t.lead_id] : undefined;
                const tel = lead?.phone ? lead.phone.replace(/[^\d+]/g, '') : '';
                return (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 border-t border-line p-4 first:border-t-0" style={{ boxShadow: `inset 4px 0 0 ${g.key === 'none' ? 'var(--border)' : DUE_COLOR[g.key]}` }}>
                    {lead ? <Avatar name={lead.company_name} size={36} /> : <span className="grid h-9 w-9 flex-none place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{TYPE_ICON[t.type]}</span>}
                    <div className="min-w-[200px] flex-1">
                      <div className="flex items-center gap-2"><span className="font-bold text-ink">{t.title}</span><PriorityTag p={t.priority} /><span className="text-[11px] text-faint">{PRIO_LABEL[t.priority]}</span></div>
                      {lead?.contact_name && <div className="text-[12.5px] text-ink">👤 {lead.contact_name}{lead.role ? ` · ${lead.role}` : ''}</div>}
                      {t.reason && <div className="text-[12.5px] text-dim">{t.reason}</div>}
                      {t.suggested_opening && <div className="mt-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-[12px] text-ink"><b className="text-faint">Opening:</b> {t.suggested_opening}</div>}
                      {t.suggested_next_step && <div className="mt-1 text-[12px] text-faint"><b>Next:</b> {t.suggested_next_step}</div>}
                    </div>
                    {t.due_at && <span className="rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: DUE_SOFT[g.key], color: DUE_COLOR[g.key] }}>{new Date(t.due_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    <div className="flex items-center gap-1.5">
                      {lead && tel && <a href={`tel:${tel}`} className="btn btn-sm text-white" style={{ background: 'var(--green)' }}><Phone size={13} /> Call</a>}
                      {lead && <button onClick={() => setResultFor(lead)} className="btn btn-ghost btn-sm"><ClipboardList size={13} /> Log result</button>}
                      <button onClick={() => done(t.id)} className="btn btn-ghost btn-sm"><Check size={13} /> Done</button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))
      )}
      <CallResultModal lead={resultFor} open={!!resultFor} onClose={() => setResultFor(null)} onDone={() => { load(); refreshCounts(); }} />
    </div>
  );
}
