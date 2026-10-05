'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Send, Sparkles, Loader2, Search, MoreVertical, Clock, CalendarCheck, Repeat, Trophy,
  Mail, Plus, ArrowRight, Inbox as InboxIcon, MessagesSquare, ArrowDownLeft, Trash2, Phone,
  FileText, XCircle, PhoneCall, PenLine, TrendingUp,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Thinking, Modal, Avatar } from '@/components/ui';
import { usePager, Pagination, ConfirmDialog } from '@/components/listing';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ComposeModal } from '@/components/ComposeModal';
import { FollowupList } from '@/components/FollowupList';
import { ThreadDrawer } from '@/components/ThreadDrawer';
import { PipelineTile, StageBar } from '@/components/PipelineTile';
import { DateRangeSelect, ExportButton, useDateFilter } from '@/components/DateRange';
import { buildThreads, rangeBounds, inRange, rangeLabel, type Thread } from '@/lib/threads';
import { exportLeads, exportThreads } from '@/lib/export';
import { PIPELINE, isPipelineKey, stepOf, stageLabel, type PipelineKey } from '@/lib/pipeline';
import { relTime } from '@/lib/utils';
import type { Message, Lead, Stage } from '@/lib/types';

/** 1–7 are the pipeline steps (shared with the dashboard); 8–9 are conversation views. */
type StageKey = PipelineKey | 'inbox' | 'waiting';

const EXTRA: { key: Exclude<StageKey, PipelineKey>; n: number; label: string; icon: typeof Send; hint: string; color: string }[] = [
  { key: 'inbox', n: 8, label: 'Inbox', icon: InboxIcon, hint: 'Conversations with a reply', color: '#A435E8' },
  { key: 'waiting', n: 9, label: 'Waiting for answer', icon: Clock, hint: 'They replied — your turn', color: '#E08C1F' },
];

const STEP_ICON: Record<PipelineKey, React.ReactNode> = {
  lead: <Sparkles size={14} />, contacted: <PhoneCall size={14} />, followup: <Repeat size={14} />, meeting: <CalendarCheck size={14} />,
  deal: <FileText size={14} />, won: <Trophy size={14} />, disqualified: <XCircle size={14} />,
};

const EMPTY: Record<PipelineKey, string> = {
  lead: 'No new leads. Use Find leads or Add lead to fill the pipeline.',
  contacted: 'Nobody in Contacted. Leads move here automatically after the first email or call.',
  followup: 'No follow-ups pending.',
  meeting: 'No booked meetings yet. Answer a reply and mark it as Meeting booked.',
  deal: 'No active deals yet. Mark a lead as Active deal once a proposal is sent.',
  won: 'No wins yet. Mark a signed deal as Won to see it here.',
  disqualified: 'Nothing disqualified. Mark leads that are not a fit as Disqualified to keep the pipeline clean.',
};

const LS_STAGE = 'klientic.inbox.stage';
const ALL_KEYS: StageKey[] = [...PIPELINE.map((p) => p.key), ...EXTRA.map((e) => e.key)];

export default function InboxPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<StageKey>('inbox');
  const [range, setRange] = useDateFilter('inbox');
  const [q, setQ] = useState('');
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [threadKey, setThreadKey] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  // either a lead id (deletes the lead + everything linked) or a thread key (deletes just those messages)
  const [confirmDelete, setConfirmDelete] = useState<{ leadId?: string; threadKey?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem(LS_STAGE) as StageKey | null; if (s && ALL_KEYS.includes(s)) setStage(s); } catch { /* ignore */ }
  }, []);
  const pickStage = (s: StageKey) => { setStage(s); setQ(''); try { localStorage.setItem(LS_STAGE, s); } catch { /* ignore */ } };

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const [{ data: m }, { data: l }] = await Promise.all([
      supabase.from('messages').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(5000),
      supabase.from('leads').select('*').eq('project_id', project.id).limit(5000),
    ]);
    setMsgs((m as Message[]) || []);
    setLeads((l as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  const leadById = useMemo(() => { const map: Record<string, Lead> = {}; leads.forEach((l) => (map[l.id] = l)); return map; }, [leads]);
  const threads = useMemo(() => buildThreads(msgs, leadById), [msgs, leadById]);
  const threadByKey = useMemo(() => { const m: Record<string, Thread> = {}; threads.forEach((t) => (m[t.key] = t)); return m; }, [threads]);
  const threadForLead = (leadId: string | null | undefined) => (leadId ? threadByKey[`lead:${leadId}`] || null : null);
  const bounds = useMemo(() => rangeBounds(range), [range]);

  // ── buckets (all respect the date range) ──
  const inboxThreads = useMemo(() => threads.filter((t) => t.inboundCount > 0 && inRange(t.last.sent_at || t.last.created_at, bounds)), [threads, bounds]);
  const waitingThreads = useMemo(() => inboxThreads.filter((t) => t.theirTurn && !(t.lead && (t.lead.stage === 'meeting' || t.lead.stage === 'closed'))), [inboxThreads]);
  const byStep = useMemo(() => {
    const leadInRange = (l: Lead) => range.key === 'all' || inRange(l.last_contacted_at || l.updated_at || l.created_at, bounds);
    const out = {} as Record<PipelineKey, Lead[]>;
    for (const p of PIPELINE) out[p.key] = leads.filter((l) => (p.stages as string[]).includes(l.stage) && leadInRange(l));
    return out;
  }, [leads, bounds, range]);

  const counts: Record<StageKey, number> = {
    lead: byStep.lead.length, contacted: byStep.contacted.length, followup: byStep.followup.length, meeting: byStep.meeting.length,
    deal: byStep.deal.length, won: byStep.won.length, disqualified: byStep.disqualified.length,
    inbox: inboxThreads.length, waiting: waitingThreads.length,
  };

  async function moveLead(leadId: string | null | undefined, toStage: Stage) {
    if (!leadId) return toast.error('This conversation is not linked to a lead yet.');
    const label = stepOf(toStage).label;
    const patch: Record<string, unknown> = { stage: toStage, updated_at: new Date().toISOString() };
    if (toStage === 'followup1') patch.next_action_at = new Date().toISOString();
    if (['meeting', 'positive', 'closed', 'lost'].includes(toStage)) patch.next_action_at = null;
    const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${label}`);
    load(); refreshCounts();
  }

  if (!project) return <Thinking label="Loading…" />;

  /** Three-dot menu: the move actions use exactly the names on the stage cards. */
  const menuFor = (leadId: string | null | undefined, threadK?: string | null) => {
    const lead = leadId ? leadById[leadId] : null;
    const current = lead ? stepOf(lead.stage).key : null;
    return [
      ...(threadK ? [{ label: 'Open conversation', icon: <MessagesSquare size={14} />, run: () => setThreadKey(threadK) }] : []),
      ...(lead?.email ? [{ label: 'Write email', icon: <PenLine size={14} />, run: () => setComposeLead(lead) }] : []),
      ...PIPELINE.filter((p) => p.key !== 'lead' && p.key !== current).map((p) => ({
        label: `Mark as ${p.label.toLowerCase()}`, icon: STEP_ICON[p.key], run: () => moveLead(leadId, p.target),
      })),
      leadId
        ? { label: 'Delete lead', icon: <Trash2 size={14} />, danger: true, run: () => setConfirmDelete({ leadId }) }
        : { label: 'Delete conversation', icon: <Trash2 size={14} />, danger: true, run: () => threadK && setConfirmDelete({ threadKey: threadK }) },
    ];
  };
  const openConversationOrLead = (l: Lead) => { const t = threadForLead(l.id); if (t) setThreadKey(t.key); else setDrawerLead(l); };

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    let error: { message: string } | null = null;
    if (confirmDelete.leadId) {
      ({ error } = await supabase.from('leads').delete().eq('id', confirmDelete.leadId));
    } else if (confirmDelete.threadKey) {
      const ids = (threadByKey[confirmDelete.threadKey]?.messages || []).map((m) => m.id);
      if (ids.length) ({ error } = await supabase.from('messages').delete().in('id', ids));
    }
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(confirmDelete.leadId ? 'Lead deleted' : 'Conversation deleted');
    setConfirmDelete(null); setThreadKey(null); setDrawerLead(null);
    load(); refreshCounts();
  }
  const refresh = () => { load(); refreshCounts(); };
  const current = isPipelineKey(stage) ? PIPELINE.find((p) => p.key === stage)! : EXTRA.find((s) => s.key === stage)!;

  // export = exactly what the current stage shows (date range + search), all pages
  const qq = q.toLowerCase();
  const matchLead = (l: Lead) => !qq || `${l.company_name} ${l.contact_name} ${l.email} ${l.phone || ''}`.toLowerCase().includes(qq);
  const matchThread = (t: Thread) => !qq || `${t.lead?.company_name || ''} ${t.counterpart} ${t.last.subject} ${t.last.body}`.toLowerCase().includes(qq);
  const exportLeadList = isPipelineKey(stage) ? byStep[stage].filter(matchLead) : [];
  const exportThreadList = stage === 'inbox' ? inboxThreads.filter(matchThread) : stage === 'waiting' ? waitingThreads.filter(matchThread) : [];
  const doExport = () => {
    const what = `inbox-${stage}`;
    if (isPipelineKey(stage)) exportLeads(exportLeadList, what, project.name, rangeLabel(range));
    else exportThreads(exportThreadList, what, project.name, rangeLabel(range));
  };

  // little "alive" facts for the conversation tiles
  const dayAgo = Date.now() - 86400000;
  const repliedToday = inboxThreads.filter((t) => t.lastInbound && new Date(t.lastInbound.sent_at || t.lastInbound.created_at).getTime() >= dayAgo).length;
  const oldestWaiting = waitingThreads.reduce((m, t) => Math.min(m, new Date(t.last.sent_at || t.last.created_at).getTime()), Infinity);
  const inboxSub = <><b className="text-ink">{repliedToday}</b> new {repliedToday === 1 ? 'reply' : 'replies'} in the last 24h · <b className="text-ink">{waitingThreads.length}</b> your turn</>;
  const waitingSub = waitingThreads.length
    ? <span className="inline-flex items-center gap-1.5"><span className="live-dot" /> Longest waiting <b className="text-ink">{relTime(new Date(oldestWaiting).toISOString())}</b> — answer first</span>
    : <>Everyone has an answer 🎉</>;
  const contactedTotal = counts.contacted + counts.followup + counts.meeting + counts.deal + counts.won + counts.disqualified;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="eyebrow">Sales pipeline</div>
            <h2 className="text-[16px] font-extrabold tracking-tight text-ink">Move leads from left to right <span className="text-faint">→</span></h2>
          </div>
          <span className="text-[12.5px] text-dim"><b className="text-ink">{leads.length}</b> leads · click a stage to work it</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {PIPELINE.map((p, i) => (
            <PipelineTile key={p.key} index={i} n={p.n} label={p.label} hint={p.hint} emoji={p.emoji} color={p.color} count={counts[p.key]}
              active={stage === p.key} onClick={() => pickStage(p.key)} />
          ))}
        </div>
        <StageBar className="px-1" segments={PIPELINE.map((p) => ({ key: p.key, label: p.label, count: counts[p.key], color: p.color }))} />
      </section>

      <section className="space-y-3">
        <div className="eyebrow">Conversations</div>
        <div className="grid gap-3 md:grid-cols-3">
          {EXTRA.map((s, i) => {
            const Ico = s.icon;
            return <PipelineTile key={s.key} index={7 + i} size="lg" n={s.n} label={s.label} hint={s.hint} icon={<Ico size={22} />} color={s.color} count={counts[s.key]}
              active={stage === s.key} onClick={() => pickStage(s.key)} sub={s.key === 'inbox' ? inboxSub : waitingSub} />;
          })}
          <HealthCard index={9} contacted={contactedTotal} replied={inboxThreads.length} meetings={counts.meeting + counts.won} won={counts.won} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <h2 className="text-[15px] font-extrabold text-ink">{current.n}. {current.label}</h2>
        <span className="text-[12px] text-faint">· {current.hint}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DateRangeSelect value={range} onChange={setRange} />
          <ExportButton count={exportLeadList.length + exportThreadList.length} noun={isPipelineKey(stage) ? 'leads' : 'conversations'} onClick={doExport} />
          <div className="flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2">
            <Search size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent text-[13px] outline-none text-ink" />
          </div>
          <button onClick={() => setLogOpen(true)} className="btn btn-ghost"><Plus size={15} /> Log a reply</button>
        </div>
      </div>

      {loading ? <Thinking label="Loading pipeline…" /> : (
        <>
          {(stage === 'inbox' || stage === 'waiting') && (
            <ThreadList threads={stage === 'inbox' ? inboxThreads : waitingThreads} q={q} menuFor={menuFor} onOpen={(t) => setThreadKey(t.key)}
              empty={stage === 'waiting' ? 'Nothing waiting — every reply has been answered.' : 'No replies yet. When a lead writes back, the whole conversation shows up here.'} />
          )}
          {stage === 'followup' && <FollowupList leads={byStep.followup} q={q} onOpen={openConversationOrLead} onWrite={setComposeLead} onChange={refresh} menuFor={(id) => menuFor(id, threadForLead(id)?.key)} />}
          {isPipelineKey(stage) && stage !== 'followup' && (
            <LeadList key={stage} pagerKey={`inbox-${stage}`} leads={byStep[stage]} q={q} empty={EMPTY[stage]} onOpen={openConversationOrLead} onOpenLead={setDrawerLead}
              onWrite={setComposeLead} threadFor={threadForLead} menuFor={(id) => menuFor(id, threadForLead(id)?.key)} />
          )}
        </>
      )}

      <ThreadDrawer thread={threadKey ? threadByKey[threadKey] || null : null} onClose={() => setThreadKey(null)} onChange={refresh}
        onMove={(id, s) => moveLead(id, s)} onOpenLead={(l) => { setThreadKey(null); setDrawerLead(l); }}
        onDelete={(id) => setConfirmDelete({ leadId: id })} onDeleteThread={(key) => setConfirmDelete({ threadKey: key })} />
      <ConfirmDialog open={!!confirmDelete} busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={doDelete}
        title={confirmDelete?.leadId ? 'Delete this lead?' : 'Delete this conversation?'}
        body={confirmDelete?.leadId
          ? <>This permanently removes <b className="text-ink">{leadById[confirmDelete.leadId]?.company_name || 'the lead'}</b> together with every email, reply and task linked to it. This cannot be undone.</>
          : <>This removes every message with <b className="text-ink">{confirmDelete?.threadKey ? threadByKey[confirmDelete.threadKey]?.counterpart : ''}</b> from Klientic. Emails already delivered stay in their inbox.</>} />
      <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onChange={refresh} />
      <ComposeModal open={!!composeLead} lead={composeLead} onClose={() => setComposeLead(null)} onSent={refresh} />
      {logOpen && <LogReplyModal projectId={project.id} leads={leads} onClose={() => setLogOpen(false)} onDone={() => { pickStage('waiting'); refresh(); }} />}
    </div>
  );
}

/* ── pipeline health: reply → meeting → win conversion ───────────────────────── */
function HealthCard({ contacted, replied, meetings, won, index }: { contacted: number; replied: number; meetings: number; won: number; index: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, []);
  const rows = [
    { label: 'Reply rate', value: replied, of: contacted, hint: `${replied} of ${contacted} contacted leads replied`, color: '#A435E8', icon: <ArrowDownLeft size={13} /> },
    { label: 'Meeting rate', value: meetings, of: replied, hint: `${meetings} of ${replied} conversations became a meeting`, color: '#DB2777', icon: <CalendarCheck size={13} /> },
    { label: 'Win rate', value: won, of: meetings, hint: `${won} of ${meetings} meetings won`, color: '#16A34A', icon: <Trophy size={13} /> },
  ];
  return (
    <div className="card reveal !p-5" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><TrendingUp size={16} /></span>
        <div><div className="text-[12.5px] font-extrabold text-ink">Pipeline health</div><div className="text-[11px] text-faint">For the selected period</div></div>
      </div>
      <div className="mt-4 space-y-3.5">
        {rows.map((r) => {
          const pct = r.of ? Math.min(100, Math.round((r.value / r.of) * 100)) : 0;
          return (
            <div key={r.label} title={r.hint}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-dim"><span style={{ color: r.color }}>{r.icon}</span>{r.label}</span>
                <span className="text-[11px] text-faint">{r.value}/{r.of} · <b className="text-[12px] text-ink">{pct}%</b></span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: on ? `${pct}%` : '0%', background: r.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── three-dot menu ─────────────────────────────────────────────────────────── */
function ThreeDot({ items }: { items: { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean }[] }) {
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
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label="More actions"
        className="grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-ink"><MoreVertical size={16} /></button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
          {items.map((it) => (
            <button key={it.label} onClick={(e) => { e.stopPropagation(); setOpen(false); it.run(); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition hover:bg-surface-2 ${it.danger ? 'border-t border-line text-bad' : 'text-ink'}`}>{it.icon}{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

type MenuFor = (leadId: string | null | undefined, threadKey?: string | null) => { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean }[];

/* ── Inbox / Waiting: conversations ──────────────────────────────────────────── */
function ThreadList({ threads, q, empty, menuFor, onOpen }: { threads: Thread[]; q: string; empty: string; menuFor: MenuFor; onOpen: (t: Thread) => void }) {
  const filtered = useMemo(() => threads.filter((t) => !q || `${t.lead?.company_name || ''} ${t.counterpart} ${t.last.subject} ${t.last.body}`.toLowerCase().includes(q.toLowerCase())), [threads, q]);
  const pager = usePager(filtered, 'inbox-threads', 25);
  useEffect(() => { pager.reset(); }, [q, threads.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!filtered.length) return <Card><EmptyState icon={<InboxIcon size={38} />} title={q ? 'No matches' : 'Nothing here'} sub={empty} /></Card>;
  return (
    <Card className="!p-0">
      {pager.slice.map((t, i) => (
        <div key={t.key} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
          className={`reveal flex items-center gap-3 border-t border-line p-4 transition first:border-t-0 hover:bg-surface-2 ${t.theirTurn ? 'row-turn' : ''}`}>
          <button onClick={() => onOpen(t)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="relative flex-none">
              <Avatar name={t.lead?.company_name || t.counterpart} size={38} />
              <span className="absolute -bottom-1 -right-1 grid place-items-center rounded-full border-2 border-surface text-white"
                style={{ width: 18, height: 18, background: t.theirTurn ? 'var(--amber)' : 'var(--green)' }} title={t.theirTurn ? 'They wrote last' : 'You wrote last'}>
                {t.theirTurn ? <ArrowDownLeft size={10} /> : <Send size={10} />}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-bold text-ink">{t.lead?.company_name || t.counterpart}</span>
                {t.theirTurn && <span className="inline-flex flex-none items-center gap-1.5 rounded-md px-1.5 py-px text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><span className="live-dot" style={{ width: 5, height: 5 }} />Your turn</span>}
                {t.lead && <span className={`stagetag s-${t.lead.stage} hidden sm:inline`}>{stageLabel(t.lead.stage)}</span>}
              </div>
              <div className="truncate text-[12px] text-dim">{t.last.direction === 'inbound' ? '' : 'You: '}{t.last.subject ? `${t.last.subject} — ` : ''}{(t.last.body || '').replace(/\s+/g, ' ').slice(0, 120)}</div>
            </div>
            <span className="hidden whitespace-nowrap text-[11px] text-faint sm:inline">{t.messages.length} msg · {t.inboundCount} from them</span>
            <span className="whitespace-nowrap text-[11.5px] text-faint">{relTime(t.last.sent_at || t.last.created_at)}</span>
          </button>
          <ThreeDot items={menuFor(t.leadId, t.key)} />
        </div>
      ))}
      <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="conversations" />
    </Card>
  );
}

/* ── Pipeline steps (Lead, Contacted, Meeting booked, Active deal, Won, Disqualified): lead cards ── */
function LeadList({ leads, q, empty, pagerKey, onOpen, onOpenLead, onWrite, threadFor, menuFor }: {
  leads: Lead[]; q: string; empty: string; pagerKey: string; onOpen: (l: Lead) => void; onOpenLead: (l: Lead) => void; onWrite: (l: Lead) => void;
  threadFor: (leadId: string) => Thread | null; menuFor: (leadId: string) => { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean }[];
}) {
  const filtered = useMemo(() => leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email} ${l.phone || ''}`.toLowerCase().includes(q.toLowerCase())), [leads, q]);
  const pager = usePager(filtered, pagerKey, 24);
  useEffect(() => { pager.reset(); }, [q, leads.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!filtered.length) return <Card><EmptyState icon={<Trophy size={38} />} title={q ? 'No matches' : 'Nothing here yet'} sub={empty} /></Card>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pager.slice.map((l, i) => {
          const t = threadFor(l.id);
          return (
            <div key={l.id} className="card reveal !p-4 transition hover:-translate-y-0.5 hover:shadow-pop" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
              <div className="flex items-start gap-3">
                <Avatar name={l.company_name} size={40} />
                <button onClick={() => onOpen(l)} className="min-w-0 flex-1 text-left" title={t ? 'Open the full conversation' : 'Open lead'}>
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-ink">{l.company_name}</span>
                    <span className={`stagetag s-${l.stage} flex-none`}>{stageLabel(l.stage)}</span>
                  </div>
                  {l.contact_name && <div className="truncate text-[12.5px] text-dim">{l.contact_name}{l.role ? ` · ${l.role}` : ''}</div>}
                  {l.email && <div className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-faint"><Mail size={11} /> {l.email}</div>}
                  {l.phone && <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-faint"><Phone size={11} /> {l.phone}</div>}
                </button>
                <ThreeDot items={[
                  ...(t ? [{ label: 'History (all messages)', icon: <MessagesSquare size={14} />, run: () => onOpen(l) }] : []),
                  { label: 'Open lead details', icon: <ArrowRight size={14} />, run: () => onOpenLead(l) },
                  ...menuFor(l.id).filter((m) => m.label !== 'Open conversation'),
                ]} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11.5px] text-faint">
                {t ? <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-px font-semibold text-dim"><MessagesSquare size={11} /> {t.messages.length} msg · {t.inboundCount} from them</span> : <span>No messages yet</span>}
                {l.last_contacted_at && <span className="ml-auto">Last contact {relTime(l.last_contacted_at)}</span>}
                {!l.last_contacted_at && l.email && <button onClick={() => onWrite(l)} className="btn btn-ghost btn-sm ml-auto !py-1"><Send size={12} /> Write email</button>}
              </div>
            </div>
          );
        })}
      </div>
      {pager.pages > 1 && (
        <Card className="!p-0 [&>div]:border-t-0">
          <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="leads" />
        </Card>
      )}
    </div>
  );
}

/* ── manually log a reply that landed in another mailbox ──────────────────────── */
function LogReplyModal({ projectId, leads, onClose, onDone }: { projectId: string; leads: Lead[]; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [leadId, setLeadId] = useState('');
  const [busy, setBusy] = useState(false);
  const options = leads.filter((l) => l.email).slice(0, 1000);
  async function submit() {
    if (!text.trim()) return toast.error('Paste the reply text');
    setBusy(true);
    try {
      const res = await fetch('/api/inbox/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, text, leadId: leadId || undefined }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(`Logged & classified: ${data.category}`); onDone(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Log an incoming reply">
      <p className="mb-3 text-[12.5px] text-dim">If a reply landed in another mailbox, paste it here so it joins the conversation under &ldquo;Waiting for answer&rdquo;.</p>
      <div className="field"><label>From lead (optional)</label>
        <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}><option value="">— unlinked —</option>{options.map((l) => <option key={l.id} value={l.id}>{l.company_name}{l.email ? ` · ${l.email}` : ''}</option>)}</select></div>
      <div className="field"><label>Reply text</label><textarea className="input min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the email reply you received…" /></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Log &amp; classify</button></div>
    </Modal>
  );
}
