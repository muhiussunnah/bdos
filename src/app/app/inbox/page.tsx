'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Send, Sparkles, Loader2, AlertTriangle, Search, MoreVertical, Clock, CalendarCheck, Repeat, Trophy,
  Mail, Paperclip, Plus, ArrowRight, Inbox as InboxIcon, MessagesSquare, ArrowDownLeft, CalendarDays, Trash2, Phone,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Thinking, Modal } from '@/components/ui';
import { usePager, Pagination, ConfirmDialog } from '@/components/listing';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ComposeModal } from '@/components/ComposeModal';
import { FollowupList } from '@/components/FollowupList';
import { ThreadDrawer } from '@/components/ThreadDrawer';
import { buildThreads, stamp, RANGES, rangeBounds, inRange, type Thread, type RangeKey } from '@/lib/threads';
import { relTime } from '@/lib/utils';
import type { Message, Lead } from '@/lib/types';

type StageKey = 'outreach' | 'inbox' | 'waiting' | 'meeting' | 'followup' | 'sale';

const STAGES: { key: StageKey; label: string; icon: typeof Send; hint: string }[] = [
  { key: 'outreach', label: 'First outreach', icon: Send, hint: 'Every email you have sent' },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon, hint: 'Conversations with a reply' },
  { key: 'waiting', label: 'Waiting for answer', icon: Clock, hint: 'They replied — your turn' },
  { key: 'meeting', label: 'Booked meeting', icon: CalendarCheck, hint: 'Meetings on the calendar' },
  { key: 'followup', label: 'Follow-up', icon: Repeat, hint: 'No reply yet — nudge them' },
  { key: 'sale', label: 'To sale', icon: Trophy, hint: 'Marked as won' },
];

const FOLLOWUP_STAGES = ['contacted', 'followup1', 'followup2', 'followup3'];
const LS_RANGE = 'klientic.inbox.range';

export default function InboxPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<StageKey>('outreach');
  const [range, setRange] = useState<RangeKey>('all');
  const [q, setQ] = useState('');
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [threadKey, setThreadKey] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { try { const r = localStorage.getItem(LS_RANGE) as RangeKey | null; if (r && RANGES.some((x) => x.key === r)) setRange(r); } catch { /* ignore */ } }, []);
  const pickRange = (r: RangeKey) => { setRange(r); try { localStorage.setItem(LS_RANGE, r); } catch { /* ignore */ } };

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
  const outbound = useMemo(() => msgs.filter((m) => m.direction === 'outbound' && inRange(m.sent_at || m.created_at, bounds)), [msgs, bounds]);
  const inboxThreads = useMemo(() => threads.filter((t) => t.inboundCount > 0 && inRange(t.last.sent_at || t.last.created_at, bounds)), [threads, bounds]);
  const waitingThreads = useMemo(() => inboxThreads.filter((t) => t.theirTurn && !(t.lead && (t.lead.stage === 'meeting' || t.lead.stage === 'closed'))), [inboxThreads]);
  const leadInRange = (l: Lead) => range === 'all' || inRange(l.last_contacted_at || l.updated_at || l.created_at, bounds);
  const meetingLeads = useMemo(() => leads.filter((l) => l.stage === 'meeting' && leadInRange(l)), [leads, bounds]); // eslint-disable-line react-hooks/exhaustive-deps
  const saleLeads = useMemo(() => leads.filter((l) => l.stage === 'closed' && leadInRange(l)), [leads, bounds]); // eslint-disable-line react-hooks/exhaustive-deps
  const followupLeads = useMemo(() => leads.filter((l) => FOLLOWUP_STAGES.includes(l.stage) && leadInRange(l)), [leads, bounds]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts: Record<StageKey, number> = {
    outreach: outbound.length, inbox: inboxThreads.length, waiting: waitingThreads.length,
    meeting: meetingLeads.length, followup: followupLeads.length, sale: saleLeads.length,
  };

  async function moveLead(leadId: string | null | undefined, toStage: string) {
    if (!leadId) return toast.error('This conversation is not linked to a lead yet.');
    const label = toStage === 'meeting' ? 'Booked meeting' : toStage === 'closed' ? 'To sale' : 'Follow-up';
    const patch: Record<string, unknown> = { stage: toStage, updated_at: new Date().toISOString() };
    if (toStage === 'followup1') patch.next_action_at = new Date().toISOString();
    if (toStage === 'meeting' || toStage === 'closed') patch.next_action_at = null;
    const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${label}`);
    load(); refreshCounts();
  }

  if (!project) return <Thinking label="Loading…" />;

  const menuFor = (leadId: string | null | undefined, threadK?: string | null) => [
    ...(threadK ? [{ label: 'Open conversation', icon: <MessagesSquare size={14} />, run: () => setThreadKey(threadK) }] : []),
    { label: 'Mark as booked meeting', icon: <CalendarCheck size={14} />, run: () => moveLead(leadId, 'meeting') },
    { label: 'Mark as follow-up', icon: <Repeat size={14} />, run: () => moveLead(leadId, 'followup1') },
    { label: 'Mark as sold', icon: <Trophy size={14} />, run: () => moveLead(leadId, 'closed') },
    ...(leadId ? [{ label: 'Delete lead', icon: <Trash2 size={14} />, danger: true, run: () => setConfirmDelete(leadId) }] : []),
  ];
  const openConversationOrLead = (l: Lead) => { const t = threadForLead(l.id); if (t) setThreadKey(t.key); else setDrawerLead(l); };

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('leads').delete().eq('id', confirmDelete);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success('Lead deleted');
    setConfirmDelete(null); setThreadKey(null); setDrawerLead(null);
    load(); refreshCounts();
  }
  const openThreadFor = (m: Message) => setThreadKey(m.lead_id ? `lead:${m.lead_id}` : threads.find((t) => t.messages.some((x) => x.id === m.id))?.key || null);
  const refresh = () => { load(); refreshCounts(); };
  const current = STAGES.find((s) => s.key === stage)!;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => {
          const Ico = s.icon; const active = stage === s.key;
          return (
            <button key={s.key} onClick={() => { setStage(s.key); setQ(''); }}
              className={`rounded-2xl border p-4 text-left transition ${active ? 'border-accent bg-[var(--accent-soft)]' : 'border-line bg-surface hover:border-line-2'}`}>
              <div className="flex items-center gap-2 text-[12px] font-bold text-dim">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: active ? 'var(--accent)' : 'var(--accent-soft)', color: active ? '#fff' : 'var(--accent)' }}><Ico size={14} /></span>
                <span className="truncate">{s.label}</span>
              </div>
              <div className="mt-2 text-[26px] font-black leading-none text-ink">{counts[s.key]}</div>
              <div className="mt-1 truncate text-[11px] text-faint">{s.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-extrabold text-ink">{current.label}</h2>
        <span className="text-[12px] text-faint">· {current.hint}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-[11px] border border-line bg-surface px-2.5 py-1.5">
            <CalendarDays size={14} className="text-faint" />
            <select className="bg-transparent text-[12.5px] font-semibold text-ink outline-none" value={range} onChange={(e) => pickRange(e.target.value as RangeKey)} aria-label="Date range">
              {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2">
            <Search size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent text-[13px] outline-none text-ink" />
          </div>
          <button onClick={() => setLogOpen(true)} className="btn btn-ghost"><Plus size={15} /> Log a reply</button>
        </div>
      </div>

      {loading ? <Thinking label="Loading pipeline…" /> : (
        <>
          {stage === 'outreach' && <OutreachList items={outbound} leadById={leadById} q={q} menuFor={menuFor} onOpen={openThreadFor} threadKeyOf={(m) => (m.lead_id ? `lead:${m.lead_id}` : null)} />}
          {(stage === 'inbox' || stage === 'waiting') && (
            <ThreadList threads={stage === 'inbox' ? inboxThreads : waitingThreads} q={q} menuFor={menuFor} onOpen={(t) => setThreadKey(t.key)}
              empty={stage === 'waiting' ? 'Nothing waiting — every reply has been answered.' : 'No replies yet. When a lead writes back, the whole conversation shows up here.'} />
          )}
          {stage === 'meeting' && <LeadList leads={meetingLeads} q={q} empty="No booked meetings yet. Answer a reply and mark it as a booked meeting." onOpen={openConversationOrLead} onOpenLead={setDrawerLead} threadFor={threadForLead} menuFor={(id) => menuFor(id, threadForLead(id)?.key)} />}
          {stage === 'followup' && <FollowupList leads={followupLeads} q={q} onOpen={openConversationOrLead} onWrite={setComposeLead} onChange={refresh} menuFor={(id) => menuFor(id, threadForLead(id)?.key)} />}
          {stage === 'sale' && <LeadList leads={saleLeads} q={q} empty="No sales yet. Mark a won conversation as sold to see it here." onOpen={openConversationOrLead} onOpenLead={setDrawerLead} threadFor={threadForLead} menuFor={(id) => menuFor(id, threadForLead(id)?.key)} />}
        </>
      )}

      <ThreadDrawer thread={threadKey ? threadByKey[threadKey] || null : null} onClose={() => setThreadKey(null)} onChange={refresh}
        onMove={(id, s) => moveLead(id, s)} onOpenLead={(l) => { setThreadKey(null); setDrawerLead(l); }} onDelete={(id) => setConfirmDelete(id)} />
      <ConfirmDialog open={!!confirmDelete} busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={doDelete} title="Delete this lead?"
        body={<>This permanently removes <b className="text-ink">{confirmDelete ? leadById[confirmDelete]?.company_name || 'the lead' : ''}</b> together with every email, reply and task linked to it. This cannot be undone.</>} />
      <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onChange={refresh} />
      <ComposeModal open={!!composeLead} lead={composeLead} onClose={() => setComposeLead(null)} onSent={refresh} />
      {logOpen && <LogReplyModal projectId={project.id} leads={leads} onClose={() => setLogOpen(false)} onDone={() => { setStage('waiting'); refresh(); }} />}
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
        <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
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

/* ── First outreach: sent emails ─────────────────────────────────────────────── */
function OutreachList({ items, leadById, q, menuFor, onOpen, threadKeyOf }: {
  items: Message[]; leadById: Record<string, Lead>; q: string; menuFor: MenuFor; onOpen: (m: Message) => void; threadKeyOf: (m: Message) => string | null;
}) {
  const filtered = useMemo(() => items.filter((m) => {
    if (!q) return true;
    const lead = m.lead_id ? leadById[m.lead_id] : null;
    return `${m.subject} ${m.to_email} ${m.body} ${lead?.company_name || ''}`.toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => stamp(b) - stamp(a)), [items, q, leadById]);
  const pager = usePager(filtered, 'inbox-outreach', 25);
  useEffect(() => { pager.reset(); }, [q, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!filtered.length) return <Card><EmptyState icon={<Send size={38} />} title={q ? 'No matches' : 'No emails in this period'} sub="Sent outreach and manual emails appear here. Try a wider date range." /></Card>;
  return (
    <Card className="!p-0">
      {pager.slice.map((m) => {
        const lead = m.lead_id ? leadById[m.lead_id] : undefined;
        const meta = (m.ai_meta || {}) as { attachments?: string[] };
        return (
          <div key={m.id} className="flex items-center gap-3 border-t border-line p-4 first:border-t-0">
            <button onClick={() => onOpen(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{ background: m.status === 'failed' ? 'var(--red-soft)' : 'var(--green-soft)', color: m.status === 'failed' ? 'var(--red)' : 'var(--green)' }}>
                {m.status === 'failed' ? <AlertTriangle size={15} /> : <Send size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-ink">{m.subject || '(no subject)'}</span>
                  {meta.attachments && meta.attachments.length > 0 && <Paperclip size={12} className="flex-none text-faint" />}
                </div>
                <div className="truncate text-[12px] text-dim">{lead?.company_name ? `${lead.company_name} · ` : ''}{m.to_email}</div>
              </div>
              <span className="whitespace-nowrap text-[11.5px] text-faint">{relTime(m.sent_at || m.created_at)}</span>
              <MessagesSquare size={15} className="flex-none text-faint" />
            </button>
            <ThreeDot items={menuFor(m.lead_id, threadKeyOf(m))} />
          </div>
        );
      })}
      <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="emails" />
    </Card>
  );
}

/* ── Inbox / Waiting: conversations ──────────────────────────────────────────── */
function ThreadList({ threads, q, empty, menuFor, onOpen }: { threads: Thread[]; q: string; empty: string; menuFor: MenuFor; onOpen: (t: Thread) => void }) {
  const filtered = useMemo(() => threads.filter((t) => !q || `${t.lead?.company_name || ''} ${t.counterpart} ${t.last.subject} ${t.last.body}`.toLowerCase().includes(q.toLowerCase())), [threads, q]);
  const pager = usePager(filtered, 'inbox-threads', 25);
  useEffect(() => { pager.reset(); }, [q, threads.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!filtered.length) return <Card><EmptyState icon={<InboxIcon size={38} />} title={q ? 'No matches' : 'Nothing here'} sub={empty} /></Card>;
  return (
    <Card className="!p-0">
      {pager.slice.map((t) => (
        <div key={t.key} className={`flex items-center gap-3 border-t border-line p-4 first:border-t-0 ${t.theirTurn ? 'bg-[var(--accent-soft)]/30' : ''}`}>
          <button onClick={() => onOpen(t)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{ background: t.theirTurn ? 'var(--amber-soft)' : 'var(--green-soft)', color: t.theirTurn ? 'var(--amber)' : 'var(--green)' }}>
              {t.theirTurn ? <ArrowDownLeft size={15} /> : <Send size={15} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-bold text-ink">{t.lead?.company_name || t.counterpart}</span>
                {t.theirTurn && <span className="flex-none rounded-md px-1.5 py-px text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>Your turn</span>}
                {t.lead && <span className="stagetag hidden sm:inline">{t.lead.stage.replace('followup', 'Follow-up ')}</span>}
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

/* ── Booked meeting / To sale: lead cards ─────────────────────────────────────── */
function LeadList({ leads, q, empty, onOpen, onOpenLead, threadFor, menuFor }: {
  leads: Lead[]; q: string; empty: string; onOpen: (l: Lead) => void; onOpenLead: (l: Lead) => void;
  threadFor: (leadId: string) => Thread | null; menuFor: (leadId: string) => { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean }[];
}) {
  const filtered = leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email}`.toLowerCase().includes(q.toLowerCase()));
  if (!filtered.length) return <Card><EmptyState icon={<Trophy size={38} />} title={q ? 'No matches' : 'Nothing here yet'} sub={empty} /></Card>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((l) => {
        const t = threadFor(l.id);
        return (
          <Card key={l.id} className="!p-4">
            <div className="flex items-start gap-2">
              <button onClick={() => onOpen(l)} className="min-w-0 flex-1 text-left" title={t ? 'Open the full conversation' : 'Open lead'}>
                <div className="truncate font-bold text-ink">{l.company_name}</div>
                {l.contact_name && <div className="truncate text-[12.5px] text-dim">{l.contact_name}{l.role ? ` · ${l.role}` : ''}</div>}
                {l.email && <div className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-faint"><Mail size={11} /> {l.email}</div>}
                {l.phone && <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-faint"><Phone size={11} /> {l.phone}</div>}
              </button>
              <ThreeDot items={[
                { label: 'History (all messages)', icon: <MessagesSquare size={14} />, run: () => onOpen(l) },
                { label: 'Open lead details', icon: <ArrowRight size={14} />, run: () => onOpenLead(l) },
                ...menuFor(l.id).filter((m) => m.label !== 'Open conversation'),
              ]} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11.5px] text-faint">
              {t ? <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-px font-semibold text-dim"><MessagesSquare size={11} /> {t.messages.length} msg · {t.inboundCount} from them</span> : <span>No messages yet</span>}
              {l.last_contacted_at && <span className="ml-auto">Last contact {relTime(l.last_contacted_at)}</span>}
            </div>
          </Card>
        );
      })}
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
