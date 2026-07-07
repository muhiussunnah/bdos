'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Send, CheckCircle2, AlertTriangle, TrendingUp, Sparkles, Phone, Clock, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Metric, PriorityTag, Thinking } from '@/components/ui';
import { STAGES, relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';

interface Activity { id: string; kind: string; message: string; created_at: string }

export default function DashboardPage() {
  const { project, profile, supabase, counts } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sent, setSent] = useState(0);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const [{ data: l }, { count }, { data: a }] = await Promise.all([
      supabase.from('leads').select('*').eq('project_id', project.id),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('direction', 'outbound').eq('status', 'sent'),
      supabase.from('activity_log').select('id,kind,message,created_at').eq('project_id', project.id).order('created_at', { ascending: false }).limit(8),
    ]);
    setLeads((l as Lead[]) || []);
    setSent(count || 0);
    setActivity((a as Activity[]) || []);
    setLoading(false);
  }, [project, supabase]);

  useEffect(() => { load(); }, [load]);

  if (!project) return <Thinking label="Loading project…" />;
  if (loading) return <Thinking label="Loading dashboard…" />;

  const byStage = (s: string) => leads.filter((l) => l.stage === s).length;
  const pipeline = leads.filter((l) => !['closed', 'lost'].includes(l.stage)).length;
  const contacted = leads.filter((l) => l.stage !== 'new').length;
  const positive = leads.filter((l) => ['positive', 'meeting', 'closed'].includes(l.stage)).length;
  const nowIso = new Date().toISOString();
  const dueFollowups = leads.filter((l) => l.next_action_at && l.next_action_at <= nowIso);
  const maxStage = Math.max(1, ...STAGES.map((s) => byStage(s.key)));

  // recommendations
  const toSend = leads.filter((l) => l.stage === 'new' && l.priority === 'A').slice(0, 3);
  const toCall = leads.filter((l) => ['positive', 'meeting'].includes(l.stage)).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* greeting banner */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#171022,#241636)' }}>
        <div className="relative z-10 max-w-xl">
          <div className="text-[18px] font-extrabold tracking-tight">Good day, {profile?.full_name?.split(' ')[0] || 'there'} 👋</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">
            {leads.filter((l) => l.stage === 'new').length} new leads ready for outreach and {counts.inbox} unhandled {counts.inbox === 1 ? 'reply' : 'replies'} in the inbox.
            {dueFollowups.length > 0 && ` ${dueFollowups.length} follow-ups are due.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/leads?discover=1" className="btn btn-accent"><Sparkles size={15} /> Find more leads</Link>
            <Link href="/app/reports" className="btn btn-ghost !bg-white/10 !text-white !border-white/15">Daily report</Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle,rgba(164,53,232,.5),transparent 70%)' }} />
      </div>

      {/* metrics */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="In pipeline" value={pipeline} icon={<Users size={13} />} delta={`${leads.filter((l) => l.created_at >= new Date(Date.now() - 864e5).toISOString()).length} new today`} />
        <Metric label="Contacted" value={contacted} icon={<Send size={13} />} />
        <Metric label="Positive" value={positive} icon={<CheckCircle2 size={13} />} tone="up" delta={positive > 0 ? 'ready to close' : undefined} />
        <Metric label="Emails sent" value={sent} icon={<TrendingUp size={13} />} />
        <Metric label="Needs action" value={dueFollowups.length + counts.inbox} icon={<AlertTriangle size={13} />} tone={dueFollowups.length ? 'down' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* pipeline */}
        <Card className="lg:col-span-2">
          <div className="card-h"><h3>Lead pipeline</h3><span className="text-[12px] text-dim">{leads.length} leads</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STAGES.map((s) => {
              const c = byStage(s.key);
              return (
                <div key={s.key} className="min-w-[120px] flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-dim">{s.label}</span>
                    <span className="mono text-[13px] font-extrabold text-ink">{c}</span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-md" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-md transition-all duration-700" style={{ width: `${(c / maxStage) * 100}%`, background: 'linear-gradient(90deg,#A435E8,#E0457E)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* AI recommendations */}
        <Card>
          <div className="card-h"><h3 className="flex items-center gap-1.5"><Sparkles size={15} className="text-accent" /> Today&apos;s focus</h3></div>
          <div className="space-y-2">
            {toSend.length === 0 && toCall.length === 0 && dueFollowups.length === 0 && (
              <p className="py-4 text-center text-[13px] text-faint">All clear. Find new leads to keep the engine running.</p>
            )}
            {toCall.map((l) => <Rec key={l.id} icon={<Phone size={14} />} tone="ok" title={`Call: ${l.company_name}`} desc="Positive reply — book a meeting before it cools." href="/app/leads" />)}
            {dueFollowups.slice(0, 2).map((l) => <Rec key={l.id} icon={<Clock size={14} />} tone="warn" title={`Follow-up due: ${l.company_name}`} desc="Scheduled follow-up is ready to send." href="/app/tasks" />)}
            {toSend.map((l) => <Rec key={l.id} icon={<Send size={14} />} tone="accent" title={`Reach out: ${l.company_name}`} desc={l.reason || 'High-priority new lead.'} href="/app/leads" badge={<PriorityTag p={l.priority} />} />)}
          </div>
        </Card>
      </div>

      {/* activity */}
      <Card>
        <div className="card-h"><h3>Recent activity</h3></div>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-faint">No activity yet. Actions the agent takes will appear here.</p>
        ) : (
          <div className="space-y-1">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 text-[13px]">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Sparkles size={13} /></span>
                <span className="flex-1 text-ink">{a.message}</span>
                <span className="text-[11.5px] text-faint">{relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Rec({ icon, title, desc, tone, href, badge }: { icon: React.ReactNode; title: string; desc: string; tone: 'ok' | 'warn' | 'accent'; href: string; badge?: React.ReactNode }) {
  const bg = tone === 'ok' ? 'var(--green-soft)' : tone === 'warn' ? 'var(--amber-soft)' : 'var(--accent-soft)';
  const fg = tone === 'ok' ? 'var(--green)' : tone === 'warn' ? 'var(--amber)' : 'var(--accent)';
  return (
    <Link href={href} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 transition hover:border-accent">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: bg, color: fg }}>{icon}</span>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[13px] font-bold text-ink">{title} {badge}</div>
        <div className="text-[12px] text-dim">{desc}</div></div>
      <ArrowRight size={14} className="mt-0.5 text-faint" />
    </Link>
  );
}
