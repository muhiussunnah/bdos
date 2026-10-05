'use client';

import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Send, Sparkles, Phone, Clock, ArrowRight, Plus, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, PriorityTag, Thinking } from '@/components/ui';
import { PipelineTile, StageBar } from '@/components/PipelineTile';
import { PIPELINE } from '@/lib/pipeline';
import { relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';

interface Activity { id: string; kind: string; message: string; created_at: string }
interface TaskLite { id: string; type: string; due_at: string | null }

export default function DashboardPage() {
  const { project, profile, supabase, counts } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const [{ data: l }, { data: a }, { data: t }] = await Promise.all([
      supabase.from('leads').select('*').eq('project_id', project.id),
      supabase.from('activity_log').select('id,kind,message,created_at').eq('project_id', project.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('tasks').select('id,type,due_at').eq('project_id', project.id).eq('status', 'open'),
    ]);
    setLeads((l as Lead[]) || []);
    setActivity((a as Activity[]) || []);
    setTasks((t as TaskLite[]) || []);
    setLoading(false);
  }, [project, supabase]);

  useEffect(() => { load(); }, [load]);

  if (!project) return <Thinking label="Loading project…" />;
  if (loading) return <Thinking label="Loading dashboard…" />;

  const nowIso = new Date().toISOString();
  const dueFollowups = leads.filter((l) => l.next_action_at && l.next_action_at <= nowIso);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const callsToday = tasks.filter((t) => t.type === 'call' && (!t.due_at || new Date(t.due_at) <= endOfToday)).length;
  const countOf = (stages: string[]) => leads.filter((l) => stages.includes(l.stage)).length;

  // recommendations
  const toSend = leads.filter((l) => l.stage === 'new' && l.priority === 'A').slice(0, 3);
  const toCall = leads.filter((l) => ['positive', 'meeting'].includes(l.stage)).slice(0, 3);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

  return (
    <div className="space-y-4">
      {/* greeting banner */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#171022,#241636)' }}>
        <div className="relative z-10 max-w-xl">
          <div className="text-[22px] font-extrabold tracking-tight">Good day, {profile?.full_name?.split(' ')[0] || 'there'} 👋</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">
            You have {plural(callsToday, 'call')} today and {plural(dueFollowups.length, 'follow-up')}.
            {counts.inbox > 0 && ` ${counts.inbox} ${counts.inbox === 1 ? 'reply is' : 'replies are'} waiting for your answer.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/leads?add=1" className="btn btn-accent"><Plus size={15} /> Add new lead</Link>
            <Link href="/app/reports" className="btn btn-ghost !bg-white/10 !text-white !border-white/15"><BarChart3 size={15} /> View report</Link>
            <Link href="/app/leads?discover=1" className="btn btn-ghost !bg-white/10 !text-white !border-white/15"><Sparkles size={15} /> Find more leads</Link>
          </div>
        </div>
        {/* "Let's get meetings!" + rocket */}
        <div className="pointer-events-none absolute inset-y-0 right-5 z-10 hidden items-center gap-3 md:flex lg:right-8 lg:gap-5">
          <div className="relative -rotate-6 text-center">
            <div className="hand text-[24px] font-bold leading-[1.05] text-white/90 lg:text-[27px]">Let&apos;s<br />get meetings!</div>
            <svg className="mx-auto mt-1 ml-10" width="64" height="34" viewBox="0 0 64 34" fill="none" aria-hidden>
              <path d="M4 4 C 16 30, 38 32, 58 18" stroke="white" strokeOpacity=".85" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M49 14 L 59 18 L 53 27" stroke="white" strokeOpacity=".85" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[72px] leading-none lg:text-[92px]" style={{ filter: 'drop-shadow(0 18px 28px rgba(164,53,232,.5))' }} aria-hidden>🚀</span>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle,rgba(164,53,232,.45),transparent 70%)' }} />
      </div>

      {/* sales pipeline */}
      <Card className="relative">
        <div className="card-h !mb-4">
          <div>
            <h3>Sales pipeline</h3>
            <div className="mt-0.5 text-[12.5px] text-dim">Move leads from left to right →</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-dim">{leads.length} leads</span>
            <Link href="/app/leads" className="btn btn-ghost btn-sm">View all leads <ArrowRight size={14} /></Link>
          </div>
        </div>
        <StageRow>
          {PIPELINE.map((p, i) => (
            <Fragment key={p.key}>
              <PipelineTile index={i} n={p.n} label={p.label} hint={p.hint} emoji={p.emoji} color={p.color} count={countOf(p.stages)}
                href={`/app/leads?stage=${p.key}`} className="w-[196px] flex-none snap-start xl:w-auto xl:flex-1" />
              {i < PIPELINE.length - 1 && <ArrowRight size={14} className="hidden flex-none self-center text-faint xl:block" />}
            </Fragment>
          ))}
        </StageRow>
        <StageBar className="mt-4 px-1" segments={PIPELINE.map((p) => ({ key: p.key, label: p.label, count: countOf(p.stages), color: p.color }))} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* AI recommendations */}
        <Card>
          <div className="card-h"><h3 className="flex items-center gap-1.5"><Sparkles size={15} className="text-accent" /> Today&apos;s focus</h3></div>
          <div className="space-y-2">
            {toSend.length === 0 && toCall.length === 0 && dueFollowups.length === 0 && (
              <p className="py-4 text-center text-[13px] text-faint">All clear. Find new leads to keep the engine running.</p>
            )}
            {toCall.map((l) => <Rec key={l.id} icon={<Phone size={14} />} tone="ok" title={`Call: ${l.company_name}`} desc="Positive reply — book a meeting before it cools." href="/app/leads?stage=deal" />)}
            {dueFollowups.slice(0, 2).map((l) => <Rec key={l.id} icon={<Clock size={14} />} tone="warn" title={`Follow-up due: ${l.company_name}`} desc="Scheduled follow-up is ready to send." href="/app/followups" />)}
            {toSend.map((l) => <Rec key={l.id} icon={<Send size={14} />} tone="accent" title={`Reach out: ${l.company_name}`} desc={l.reason || 'High-priority new lead.'} href="/app/leads?stage=lead" badge={<PriorityTag p={l.priority} />} />)}
          </div>
        </Card>

        {/* activity */}
        <Card>
          <div className="card-h"><h3>Recent activity</h3></div>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-faint">No activity yet. Actions the agent takes will appear here.</p>
          ) : (
            <div className="space-y-1">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 text-[13px]">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Sparkles size={13} /></span>
                  <span className="flex-1 text-ink">{a.message}</span>
                  <span className="text-[11.5px] text-faint">{relTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Horizontal row of stage tiles with scroll arrows when the tiles overflow. */
function StageRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const go = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: 'smooth' });
  const arrow = 'absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-dim shadow-pop transition hover:text-ink md:grid';
  return (
    <div className="relative">
      {overflow && <button type="button" onClick={() => go(-1)} aria-label="Scroll left" className={`${arrow} -left-6 lg:-left-9`}><ChevronLeft size={16} /></button>}
      <div ref={ref} className="flex snap-x gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>{children}</div>
      {overflow && <button type="button" onClick={() => go(1)} aria-label="Scroll right" className={`${arrow} -right-6 lg:-right-9`}><ChevronRight size={16} /></button>}
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
