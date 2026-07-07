'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Sparkles, Send, Clock, BarChart3, ListChecks, Loader2, Zap, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Thinking } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';

interface Activity { id: string; kind: string; message: string; created_at: string }

export default function AutopilotPage() {
  const { project, supabase } = useApp();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!project) return;
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from('activity_log').select('id,kind,message,created_at').eq('project_id', project.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('leads').select('*').eq('project_id', project.id),
    ]);
    setActivity((a as Activity[]) || []);
    setLeads((l as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  async function runFollowups() {
    if (!project) return;
    setRunning('followups');
    try {
      const res = await fetch('/api/followups/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || `Sent ${data.processed} follow-ups`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setRunning(null); }
  }

  async function runReport() {
    if (!project) return;
    setRunning('report');
    try {
      const res = await fetch('/api/reports/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Daily report generated'); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setRunning(null); }
  }

  if (!project) return <Thinking label="Loading…" />;

  const nowIso = new Date().toISOString();
  const dueFollowups = leads.filter((l) => l.next_action_at && l.next_action_at <= nowIso && ['contacted', 'followup1', 'followup2'].includes(l.stage)).length;
  const newLeads = leads.filter((l) => l.stage === 'new').length;

  const actions = [
    { key: 'discover', icon: <Sparkles size={18} />, title: 'Find new leads', desc: `${newLeads} in pipeline · hunt more`, href: '/app/leads?discover=1' as const, run: null },
    { key: 'followups', icon: <Clock size={18} />, title: 'Send due follow-ups', desc: dueFollowups > 0 ? `${dueFollowups} follow-ups are due now` : 'Nothing due right now', run: runFollowups },
    { key: 'report', icon: <BarChart3 size={18} />, title: "Generate today's report", desc: 'Numbers + top opportunities', run: runReport },
    { key: 'tasks', icon: <ListChecks size={18} />, title: 'Build the call list', desc: 'Prioritised tasks from the pipeline', href: '/app/tasks' as const, run: null },
  ];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#241636,#0E0916)' }}>
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}><Zap size={20} /></span>
          <div>
            <div className="text-[17px] font-extrabold">Sales agent is online</div>
            <div className="text-[13px] text-white/60">Research, outreach, follow-up and inbox triage — you approve, it executes.</div>
          </div>
          <span className="ml-auto flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-semibold">
            <span className="animate-pulse2 h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} /> Active
          </span>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle,rgba(164,53,232,.45),transparent 70%)' }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((a) => {
          const busy = running === a.key;
          const inner = (
            <Card className="flex items-center gap-3.5 transition hover:border-accent">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{busy ? <Loader2 size={18} className="animate-spin" /> : a.icon}</span>
              <div className="min-w-0 flex-1"><div className="font-extrabold text-ink">{a.title}</div><div className="text-[12.5px] text-dim">{a.desc}</div></div>
              <ArrowRight size={16} className="text-faint" />
            </Card>
          );
          return a.href ? <Link key={a.key} href={a.href}>{inner}</Link>
            : <button key={a.key} onClick={a.run!} disabled={!!running} className="text-left">{inner}</button>;
        })}
      </div>

      <Card>
        <div className="card-h"><h3>Agent activity</h3><span className="text-[12px] text-dim">last 20 actions</span></div>
        {loading ? <Thinking label="Loading…" /> : activity.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-faint">No actions yet. Run something above and watch it appear here.</p>
        ) : (
          <div className="relative space-y-0 pl-4">
            <div className="absolute bottom-2 left-[7px] top-2 w-px" style={{ background: 'var(--border)' }} />
            {activity.map((a) => (
              <div key={a.id} className="relative flex items-start gap-3 py-2.5">
                <span className="absolute -left-4 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-surface" style={{ background: 'var(--accent)' }} />
                <div className="flex-1 text-[13px] text-ink">{a.message}</div>
                <span className="text-[11.5px] text-faint">{relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Clock size={16} /></span>
          <div>
            <div className="font-bold text-ink">Run it hands-free</div>
            <p className="mt-0.5 text-[12.5px] text-dim">Schedule <span className="mono">/api/followups/run</span> and <span className="mono">/api/reports/daily</span> with a Cloudflare Cron Trigger (or Supabase scheduled function) to make follow-ups and reports fully automatic every morning.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
