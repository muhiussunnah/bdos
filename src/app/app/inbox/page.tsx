'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Send, Sparkles, Loader2, Check, AlertTriangle, Search, ChevronDown, MoreVertical,
  Clock, CalendarCheck, Repeat, Trophy, Mail, Paperclip, Reply as ReplyIcon, Plus, ArrowRight,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Thinking, Modal } from '@/components/ui';
import { usePager, Pagination, sortBy } from '@/components/listing';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ComposeModal } from '@/components/ComposeModal';
import { FollowupList } from '@/components/FollowupList';
import { REPLY_CATEGORIES } from '@/lib/constants';
import { relTime } from '@/lib/utils';
import type { Message, Lead } from '@/lib/types';

type StageKey = 'outreach' | 'waiting' | 'meeting' | 'followup' | 'sale';

const STAGES: { key: StageKey; label: string; icon: typeof Send; hint: string }[] = [
  { key: 'outreach', label: 'First outreach', icon: Send, hint: 'Every email you have sent' },
  { key: 'waiting', label: 'Waiting for answer', icon: Clock, hint: 'They replied — your turn' },
  { key: 'meeting', label: 'Booked meeting', icon: CalendarCheck, hint: 'Meetings on the calendar' },
  { key: 'followup', label: 'Follow-up', icon: Repeat, hint: 'No reply yet — nudge them' },
  { key: 'sale', label: 'To sale', icon: Trophy, hint: 'Marked as won' },
];

const FOLLOWUP_STAGES = ['contacted', 'followup1', 'followup2', 'followup3'];

export default function InboxPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<StageKey>('outreach');
  const [q, setQ] = useState('');
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const [{ data: m }, { data: l }] = await Promise.all([
      supabase.from('messages').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(2000),
      supabase.from('leads').select('*').eq('project_id', project.id).order('last_contacted_at', { ascending: false, nullsFirst: false }).limit(2000),
    ]);
    setMsgs((m as Message[]) || []);
    setLeads((l as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  const leadById = useMemo(() => { const map: Record<string, Lead> = {}; leads.forEach((l) => (map[l.id] = l)); return map; }, [leads]);

  const outbound = useMemo(() => msgs.filter((m) => m.direction === 'outbound'), [msgs]);
  const inboundOpen = useMemo(() => msgs.filter((m) => m.direction === 'inbound' && !m.handled), [msgs]);

  const meetingLeads = useMemo(() => leads.filter((l) => l.stage === 'meeting'), [leads]);
  const saleLeads = useMemo(() => leads.filter((l) => l.stage === 'closed'), [leads]);
  const followupLeads = useMemo(() => leads.filter((l) => FOLLOWUP_STAGES.includes(l.stage)), [leads]);
  // "waiting for answer" = replies whose lead isn't already booked or sold
  const waiting = useMemo(() => inboundOpen.filter((m) => {
    const lead = m.lead_id ? leadById[m.lead_id] : null;
    return !lead || (lead.stage !== 'meeting' && lead.stage !== 'closed');
  }), [inboundOpen, leadById]);

  const counts: Record<StageKey, number> = {
    outreach: outbound.length, waiting: waiting.length, meeting: meetingLeads.length,
    followup: followupLeads.length, sale: saleLeads.length,
  };

  async function moveLead(leadId: string | null | undefined, toStage: string, label: string) {
    if (!leadId) return toast.error('This email is not linked to a lead yet — open it from Leads to move it.');
    const patch: Record<string, unknown> = { stage: toStage, updated_at: new Date().toISOString() };
    if (toStage === 'followup1') patch.next_action_at = new Date().toISOString();
    if (toStage === 'meeting' || toStage === 'closed') patch.next_action_at = null;
    const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${label}`);
    load(); refreshCounts();
  }

  if (!project) return <Thinking label="Loading…" />;

  const moveMenu = (leadId: string | null | undefined) => [
    { label: 'Mark as booked meeting', icon: <CalendarCheck size={14} />, run: () => moveLead(leadId, 'meeting', 'Booked meeting') },
    { label: 'Mark as follow-up', icon: <Repeat size={14} />, run: () => moveLead(leadId, 'followup1', 'Follow-up') },
    { label: 'Mark as sold', icon: <Trophy size={14} />, run: () => moveLead(leadId, 'closed', 'To sale') },
  ];

  return (
    <div className="space-y-4">
      {/* pipeline cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((s) => {
          const Ico = s.icon; const active = stage === s.key;
          return (
            <button key={s.key} onClick={() => { setStage(s.key); setQ(''); }}
              className={`rounded-2xl border p-4 text-left transition ${active ? 'border-accent bg-[var(--accent-soft)]' : 'border-line bg-surface hover:border-line-2'}`}>
              <div className="flex items-center gap-2 text-[12px] font-bold text-dim">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: active ? 'var(--accent)' : 'var(--accent-soft)', color: active ? '#fff' : 'var(--accent)' }}><Ico size={14} /></span>
                {s.label}
              </div>
              <div className="mt-2 text-[26px] font-black leading-none text-ink">{counts[s.key]}</div>
              <div className="mt-1 text-[11px] text-faint">{s.hint}</div>
            </button>
          );
        })}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-extrabold text-ink">{STAGES.find((s) => s.key === stage)!.label}</h2>
        <div className="ml-auto flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2">
          <Search size={14} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent text-[13px] outline-none text-ink" />
        </div>
        <button onClick={() => setLogOpen(true)} className="btn btn-ghost"><Plus size={15} /> Log a reply</button>
      </div>

      {loading ? <Thinking label="Loading pipeline…" /> : (
        <>
          {stage === 'outreach' && <OutreachList items={outbound} leadById={leadById} q={q} moveMenu={moveMenu} onReply={(l) => setComposeLead(l)} />}
          {stage === 'waiting' && <WaitingList items={waiting} leadById={leadById} q={q} moveMenu={moveMenu} onChange={() => { load(); refreshCounts(); }} />}
          {stage === 'meeting' && <LeadList leads={meetingLeads} q={q} empty="No booked meetings yet. Answer a reply and mark it as a booked meeting." onOpen={setDrawerLead} moveMenu={moveMenu} />}
          {stage === 'followup' && <FollowupList leads={followupLeads} q={q} onOpen={setDrawerLead} onWrite={setComposeLead} onChange={() => { load(); refreshCounts(); }} />}
          {stage === 'sale' && <LeadList leads={saleLeads} q={q} empty="No sales yet. Mark a won conversation as sold to see it here." onOpen={setDrawerLead} moveMenu={moveMenu} />}
        </>
      )}

      <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onChange={() => { load(); refreshCounts(); }} />
      <ComposeModal open={!!composeLead} lead={composeLead} onClose={() => setComposeLead(null)} onSent={() => { load(); refreshCounts(); }} />
      {logOpen && <LogReplyModal projectId={project.id} leads={leads} onClose={() => setLogOpen(false)} onDone={() => { setStage('waiting'); load(); refreshCounts(); }} />}
    </div>
  );
}

/* ── manually log a reply that landed in another mailbox ──────────────────────── */
function LogReplyModal({ projectId, leads, onClose, onDone }: { projectId: string; leads: Lead[]; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [leadId, setLeadId] = useState('');
  const [busy, setBusy] = useState(false);
  const options = leads.filter((l) => l.email).slice(0, 500);
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
      <p className="mb-3 text-[12.5px] text-dim">If a reply landed in your own mailbox (not captured automatically), paste it here so it joins the pipeline under &ldquo;Waiting for answer&rdquo;.</p>
      <div className="field"><label>From lead (optional)</label>
        <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}><option value="">— unlinked —</option>{options.map((l) => <option key={l.id} value={l.id}>{l.company_name}{l.email ? ` · ${l.email}` : ''}</option>)}</select></div>
      <div className="field"><label>Reply text</label><textarea className="input min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the email reply you received…" /></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Log &amp; classify</button></div>
    </Modal>
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
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
          {items.map((it) => (
            <button key={it.label} onClick={(e) => { e.stopPropagation(); setOpen(false); it.run(); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition hover:bg-surface-2 ${it.danger ? 'text-bad' : 'text-ink'}`}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── First outreach: sent emails, gmail-style ─────────────────────────────────── */
function OutreachList({ items, leadById, q, moveMenu, onReply }: {
  items: Message[]; leadById: Record<string, Lead>; q: string;
  moveMenu: (leadId: string | null | undefined) => { label: string; icon?: React.ReactNode; run: () => void }[];
  onReply: (lead: Lead) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const list = items.filter((m) => {
      if (!q) return true;
      const lead = m.lead_id ? leadById[m.lead_id] : null;
      return `${m.subject} ${m.to_email} ${m.body} ${lead?.company_name || ''}`.toLowerCase().includes(q.toLowerCase());
    });
    return sortBy(list, (m) => m.sent_at || m.created_at, 'desc');
  }, [items, q, leadById]);
  const pager = usePager(filtered, 'inbox-outreach', 25);
  useEffect(() => { pager.reset(); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!filtered.length) return <Card><EmptyState icon={<Send size={38} />} title={q ? 'No matches' : 'No emails sent yet'} sub="Sent outreach and manual emails appear here." /></Card>;

  return (
    <Card className="!p-0">
      {pager.slice.map((m) => {
        const lead = m.lead_id ? leadById[m.lead_id] : undefined;
        const meta = (m.ai_meta || {}) as { manual?: boolean; attachments?: string[]; html?: string };
        return (
          <div key={m.id} className="border-t border-line first:border-t-0">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setOpen(open === m.id ? null : m.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
                <ChevronDown size={15} className={`flex-none text-faint transition ${open === m.id ? 'rotate-180' : ''}`} />
              </button>
              <ThreeDot items={[
                ...(lead ? [{ label: 'Reply / write', icon: <ReplyIcon size={14} />, run: () => onReply(lead) }] : []),
                ...moveMenu(m.lead_id),
              ]} />
            </div>
            {open === m.id && (
              <div className="border-t border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink">
                {meta.html ? <div className="rte-preview text-ink" dangerouslySetInnerHTML={{ __html: meta.html }} /> : <div className="whitespace-pre-wrap">{m.body}</div>}
                {m.status === 'failed' && <div className="mt-2 text-[12px] font-semibold text-bad">Delivery failed. Check your Resend key and sender in Settings → Email.</div>}
              </div>
            )}
          </div>
        );
      })}
      <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="emails" />
    </Card>
  );
}

/* ── Waiting for answer: inbound replies ──────────────────────────────────────── */
function WaitingList({ items, leadById, q, moveMenu, onChange }: {
  items: Message[]; leadById: Record<string, Lead>; q: string;
  moveMenu: (leadId: string | null | undefined) => { label: string; icon?: React.ReactNode; run: () => void }[];
  onChange: () => void;
}) {
  const filtered = useMemo(() => items.filter((m) => {
    if (!q) return true;
    const lead = m.lead_id ? leadById[m.lead_id] : null;
    return `${m.subject} ${m.from_email} ${m.body} ${lead?.company_name || ''}`.toLowerCase().includes(q.toLowerCase());
  }), [items, q, leadById]);
  if (!filtered.length) return <Card><EmptyState icon={<Clock size={38} />} title={q ? 'No matches' : 'Nothing waiting'} sub="When a lead replies, their message lands here for you to answer." /></Card>;
  return <div className="space-y-3">{filtered.map((m) => <ReplyCard key={m.id} msg={m} lead={m.lead_id ? leadById[m.lead_id] : undefined} moveMenu={moveMenu} onChange={onChange} />)}</div>;
}

function ReplyCard({ msg, lead, moveMenu, onChange }: {
  msg: Message; lead?: Lead;
  moveMenu: (leadId: string | null | undefined) => { label: string; icon?: React.ReactNode; run: () => void }[];
  onChange: () => void;
}) {
  const { supabase } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [reply, setReply] = useState<{ subject: string; body: string } | null>(null);
  const meta = msg.ai_meta as { summary?: string; draft?: { subject: string; body: string } | null };
  const cat = REPLY_CATEGORIES.find((c) => c.key === msg.category);

  async function classify() {
    setBusy('classify');
    try {
      const res = await fetch('/api/inbox/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(`Classified: ${data.category}`); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
  }
  async function sendReply() {
    if (!reply) return; setBusy('send');
    try {
      const res = await fetch('/api/inbox/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id, subject: reply.subject, body: reply.body }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success('Reply sent'); setReply(null); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
  }
  async function markHandled() {
    await supabase.from('messages').update({ handled: true }).eq('id', msg.id);
    toast.success('Marked handled'); onChange();
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{lead?.company_name || msg.from_email || 'Unknown sender'}</span>
            {lead && msg.from_email && <span className="text-[12px] text-faint">{msg.from_email}</span>}
            {cat && <span className="tag" style={{ background: `var(--${cat.tone}-soft, var(--accent-soft))`, color: `var(--${cat.tone === 'ok' ? 'green' : cat.tone === 'bad' ? 'red' : cat.tone === 'warn' ? 'amber' : cat.tone === 'info' ? 'blue' : 'accent'})` }}>{cat.label}</span>}
            <span className="ml-auto text-[11.5px] text-faint">{relTime(msg.created_at)}</span>
            <ThreeDot items={moveMenu(msg.lead_id)} />
          </div>
          {msg.subject && <div className="mt-1 text-[13px] font-semibold text-ink">{msg.subject}</div>}
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-dim">{msg.body}</p>
          {meta?.summary && <div className="aibox mt-3"><div className="aihead"><Sparkles size={13} /> Agent read</div><p className="text-[13px] text-ink">{meta.summary}</p></div>}
        </div>
      </div>
      {reply ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <input className="input" value={reply.subject} onChange={(e) => setReply({ ...reply, subject: e.target.value })} />
          <textarea className="input min-h-[140px]" value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} />
          <div className="flex gap-2"><button onClick={sendReply} disabled={busy === 'send'} className="btn btn-accent">{busy === 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send reply</button>
            <button onClick={() => setReply(null)} className="btn btn-ghost">Cancel</button></div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {!msg.category && <button onClick={classify} disabled={!!busy} className="btn btn-accent btn-sm">{busy === 'classify' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Classify</button>}
          {meta?.draft && <button onClick={() => setReply(meta.draft!)} className="btn btn-ghost btn-sm"><Sparkles size={13} /> Use AI draft</button>}
          <button onClick={() => setReply({ subject: msg.subject ? (msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`) : `Re: ${lead?.company_name || ''}`, body: '' })} className="btn btn-ghost btn-sm"><ReplyIcon size={13} /> Answer</button>
          <button onClick={markHandled} className="btn btn-ghost btn-sm"><Check size={13} /> Mark handled</button>
        </div>
      )}
    </Card>
  );
}

/* ── Booked meeting / To sale: lead cards ─────────────────────────────────────── */
function LeadList({ leads, q, empty, onOpen, moveMenu }: {
  leads: Lead[]; q: string; empty: string; onOpen: (l: Lead) => void;
  moveMenu: (leadId: string | null | undefined) => { label: string; icon?: React.ReactNode; run: () => void }[];
}) {
  const filtered = leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email}`.toLowerCase().includes(q.toLowerCase()));
  if (!filtered.length) return <Card><EmptyState icon={<Trophy size={38} />} title={q ? 'No matches' : 'Nothing here yet'} sub={empty} /></Card>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((l) => (
        <Card key={l.id} className="!p-4">
          <div className="flex items-start gap-2">
            <button onClick={() => onOpen(l)} className="min-w-0 flex-1 text-left">
              <div className="truncate font-bold text-ink">{l.company_name}</div>
              {l.contact_name && <div className="truncate text-[12.5px] text-dim">{l.contact_name}{l.role ? ` · ${l.role}` : ''}</div>}
              {l.email && <div className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-faint"><Mail size={11} /> {l.email}</div>}
            </button>
            <ThreeDot items={[{ label: 'Open lead', icon: <ArrowRight size={14} />, run: () => onOpen(l) }, ...moveMenu(l.id)]} />
          </div>
          {l.last_contacted_at && <div className="mt-2 text-[11.5px] text-faint">Last contacted {relTime(l.last_contacted_at)}</div>}
        </Card>
      ))}
    </div>
  );
}
