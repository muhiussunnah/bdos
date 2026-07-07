'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ListChecks, RefreshCw, Check, Phone, Mail, Clock, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, PriorityTag, Thinking } from '@/components/ui';
import type { Task, Lead } from '@/lib/types';

const TYPE_ICON: Record<string, React.ReactNode> = {
  call: <Phone size={14} />, email: <Mail size={14} />, followup: <Clock size={14} />, review: <Sparkles size={14} />,
};
const PRIO_LABEL: Record<string, string> = { A: 'Call today', B: 'Within 48h', C: 'Email first' };

export default function TasksPage() {
  const { project, user, supabase, refreshCounts } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('tasks').select('*').eq('project_id', project.id).eq('status', 'open').order('priority').order('created_at');
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  async function build() {
    if (!project) return;
    setBuilding(true);
    // wipe today's auto tasks, then derive fresh from the pipeline
    await supabase.from('tasks').delete().eq('project_id', project.id).eq('status', 'open');
    const { data: leadsRaw } = await supabase.from('leads').select('*').eq('project_id', project.id);
    const leads = (leadsRaw as Lead[]) || [];
    const now = new Date().toISOString();
    const base = (l: Lead) => ({ project_id: project.id, owner_id: user.id, lead_id: l.id });
    const rows: Partial<Task>[] = [];
    for (const l of leads) {
      if (rows.length >= 25) break;
      if (['positive', 'meeting'].includes(l.stage)) {
        rows.push({ ...base(l), type: 'call', priority: 'A', title: `Call ${l.company_name}`, reason: l.reason || 'Positive reply — book a meeting before it cools.', suggested_opening: `Hi ${l.contact_name || 'there'}, thanks for getting back — great to hear the interest.`, suggested_next_step: 'Propose two concrete meeting times.' });
      } else if (l.next_action_at && l.next_action_at <= now && ['contacted', 'followup1', 'followup2'].includes(l.stage)) {
        rows.push({ ...base(l), type: 'followup', priority: 'B', title: `Follow up: ${l.company_name}`, reason: 'Scheduled follow-up is due (no reply yet).', suggested_next_step: 'Send a short, friendly nudge with a new angle.' });
      } else if (l.stage === 'new' && l.priority === 'A') {
        rows.push({ ...base(l), type: 'email', priority: 'C', title: `Reach out: ${l.company_name}`, reason: l.reason || 'High-fit new lead — open the conversation.', suggested_next_step: 'Send a personal first outreach.' });
      }
    }
    if (rows.length) await supabase.from('tasks').insert(rows);
    setBuilding(false);
    toast.success(`${rows.length} tasks on today's list`);
    load(); refreshCounts();
  }

  async function done(id: string) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', id);
    load(); refreshCounts();
  }

  const grouped = (['A', 'B', 'C'] as const).map((p) => ({ p, items: tasks.filter((t) => t.priority === p) }));

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-dim">A = call today · B = within 48 hours · C = email first. Rebuilt from your live pipeline.</p>
        <button onClick={build} disabled={building} className="btn btn-accent">{building ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Rebuild list</button>
      </div>

      {loading ? <Thinking label="Loading tasks…" /> : tasks.length === 0 ? (
        <Card><EmptyState icon={<ListChecks size={38} />} title="No tasks yet" sub="Build today's call list from your pipeline."
          action={<button onClick={build} className="btn btn-accent"><RefreshCw size={15} /> Build today's list</button>} /></Card>
      ) : (
        grouped.map(({ p, items }) => items.length > 0 && (
          <div key={p}>
            <div className="mb-2 flex items-center gap-2"><PriorityTag p={p} /><span className="text-[12px] font-bold uppercase tracking-wide text-dim">{PRIO_LABEL[p]}</span><span className="text-[12px] text-faint">· {items.length}</span></div>
            <Card className="!p-0">
              {items.map((t) => (
                <div key={t.id} className="flex items-start gap-3 border-t border-line p-4 first:border-t-0">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{TYPE_ICON[t.type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink">{t.title}</div>
                    {t.reason && <div className="text-[12.5px] text-dim">{t.reason}</div>}
                    {t.suggested_opening && <div className="mt-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-[12px] text-ink"><b className="text-faint">Opening:</b> {t.suggested_opening}</div>}
                    {t.suggested_next_step && <div className="mt-1 text-[12px] text-faint"><b>Next:</b> {t.suggested_next_step}</div>}
                  </div>
                  <button onClick={() => done(t.id)} className="btn btn-ghost btn-sm"><Check size={13} /> Done</button>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
