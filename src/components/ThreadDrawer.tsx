'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Paperclip, ArrowDownLeft, ArrowUpRight, Sparkles, ExternalLink, Trash2, Phone, Link2, StickyNote, MailPlus, CalendarPlus, ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ChevronUp } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { LinkLeadModal, useLeadLog } from '@/components/sales/CallFlow';
import { relTime } from '@/lib/utils';
import { PIPELINE, stepOf, stageLabel } from '@/lib/pipeline';
import { splitQuoted, type Thread } from '@/lib/threads';
import type { Lead, Message, Stage } from '@/lib/types';

/** Stage buttons under the reply box — same names as the pipeline cards. */
const MOVES = PIPELINE.filter((p) => p.key !== 'lead');

type Order = 'newest' | 'oldest';
const LS_ORDER = 'klientic.thread.order';

/**
 * Gmail-style conversation view: every message exchanged with this lead —
 * newest first by default (their latest reply is the first thing you see;
 * "Oldest first" reads it as a story) — with a reply box at the bottom.
 * Quoted history inside a reply is folded away, duplicates are shown once.
 */
export function ThreadDrawer({ thread, onClose, onChange, onMove, onOpenLead, onDelete, onDeleteThread }: {
  thread: Thread | null; onClose: () => void; onChange: () => void;
  onMove: (leadId: string | null, stage: Stage) => void;
  onOpenLead: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onDeleteThread?: (threadKey: string) => void;
}) {
  const log = useLeadLog(onChange);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(false);
  const [order, setOrder] = useState<Order>('newest');
  const topRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { if (localStorage.getItem(LS_ORDER) === 'oldest') setOrder('oldest'); } catch { /* ignore */ } }, []);
  const pickOrder = (o: Order) => { setOrder(o); try { localStorage.setItem(LS_ORDER, o); } catch { /* ignore */ } };
  useEffect(() => { setReply(''); setLink(false); }, [thread?.key]);
  // open on the latest message: the top when newest-first, the bottom when oldest-first
  useEffect(() => {
    const t = setTimeout(() => (order === 'newest' ? topRef.current?.scrollIntoView({ block: 'start' }) : endRef.current?.scrollIntoView({ block: 'end' })), 80);
    return () => clearTimeout(t);
  }, [thread?.key, order]);

  if (!thread) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const { lead, messages } = thread;
  const shown = order === 'newest' ? [...messages].reverse() : messages;
  const latestId = messages[messages.length - 1]?.id;
  const hidden = thread.raw.length - messages.length;
  const subjectBase = (messages.find((m) => m.subject)?.subject || '').replace(/^(re|sv|fwd?):\s*/i, '');
  const title = lead?.company_name || thread.counterpart || 'Conversation';
  const currentStep = lead ? stepOf(lead.stage).key : null;

  async function send() {
    if (!reply.trim()) return toast.error('Write a reply');
    setBusy(true);
    try {
      const subject = subjectBase ? `Re: ${subjectBase}` : `Re: ${title}`;
      if (thread!.lastInbound) {
        const res = await fetch('/api/inbox/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: thread!.lastInbound.id, subject, body: reply }) });
        const d = await res.json(); if (!res.ok) throw new Error(d.error);
      } else {
        if (!thread!.leadId && !thread!.counterpart) throw new Error('No recipient');
        const fd = new FormData();
        fd.set('projectId', messages[0].project_id); fd.set('to', thread!.counterpart); fd.set('subject', subject); fd.set('body', reply);
        if (thread!.leadId) fd.set('leadId', thread!.leadId);
        const res = await fetch('/api/outreach/compose', { method: 'POST', body: fd });
        const d = await res.json(); if (!res.ok) throw new Error(d.error);
      }
      // the API moves an Outreach-sent / Follow-up lead forward (next action +7 days)
      toast.success('Reply sent'); setReply(''); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Send failed'); }
    finally { setBusy(false); }
  }

  return (
    <Drawer open onClose={onClose} title={title}
      sub={`${thread.counterpart}${lead?.contact_name ? ` · ${lead.contact_name}` : ''} · ${messages.length} message${messages.length === 1 ? '' : 's'}`}
      footer={
        <div className="space-y-2.5">
          <textarea className="input min-h-[96px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={thread.theirTurn ? 'Answer them…' : 'Send a follow-up…'} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={send} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply</button>
            <div className="ml-auto">
              {thread.leadId
                ? (onDelete && <button onClick={() => onDelete(thread.leadId!)} title="Delete this lead" className="btn btn-ghost btn-sm text-bad"><Trash2 size={14} /> Delete lead</button>)
                : (onDeleteThread && <button onClick={() => onDeleteThread(thread.key)} title="Delete this conversation" className="btn btn-ghost btn-sm text-bad"><Trash2 size={14} /> Delete conversation</button>)}
            </div>
          </div>
          {lead && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-faint">Log</span>
              <button onClick={() => log.startCall(lead)} className="btn btn-ghost btn-sm"><Phone size={13} /> Call</button>
              <button onClick={() => log.openNote(lead)} className="btn btn-ghost btn-sm"><StickyNote size={13} /> Note</button>
              <button onClick={() => log.openEmail(lead)} className="btn btn-ghost btn-sm"><MailPlus size={13} /> Email outside Klientic</button>
              <button onClick={() => log.openBook(lead)} className="btn btn-sm text-white" style={{ background: '#DB2777' }}><CalendarPlus size={13} /> Book meeting</button>
              <button onClick={() => log.sendBookingLink(lead)} className="btn btn-ghost btn-sm"><Link2 size={13} /> Booking link</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-faint">Mark as</span>
            {MOVES.map((p) => {
              const active = currentStep === p.key;
              return (
                <button key={p.key} onClick={() => onMove(thread.leadId, p.target)} disabled={!thread.leadId || active} title={active ? `Already ${p.label}` : `Mark as ${p.label.toLowerCase()}`}
                  className={`btn btn-ghost btn-sm ${active ? '!border-accent !bg-[var(--accent-soft)] !text-accent !opacity-100' : ''}`}>
                  <span aria-hidden>{p.emoji}</span> {p.label}
                </button>
              );
            })}
          </div>
        </div>
      }>
      {!lead && thread.counterpart && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-dim">
          <span className="min-w-0 flex-1">Not linked to a lead — {thread.counterpart} may be a decision maker replying from another address.</span>
          <button onClick={() => setLink(true)} className="btn btn-ghost btn-sm"><Link2 size={13} /> Link to a lead</button>
          <LinkLeadModal open={link} onClose={() => setLink(false)} onDone={onChange} projectId={messages[0].project_id} messageIds={thread.raw.map((m) => m.id)} counterpart={thread.counterpart} />
        </div>
      )}
      {lead && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-dim">
          <button onClick={() => onOpenLead(lead)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-ink">
            <span className={`stagetag s-${lead.stage}`}>{stageLabel(lead.stage)}</span>
            <span className="truncate">{lead.industry || ''}{lead.location ? ` · ${lead.location}` : ''}</span>
            <ExternalLink size={13} className="flex-none text-faint" />
          </button>
          {lead.phone && (
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} title="Call" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 font-bold text-ink hover:border-accent hover:text-accent">
              <Phone size={12} /> {lead.phone}
            </a>
          )}
        </div>
      )}
      <div ref={topRef} className="mb-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-faint">
        <span>{messages.length} message{messages.length === 1 ? '' : 's'}{hidden > 0 ? ` · ${hidden} duplicate${hidden === 1 ? '' : 's'} shown once` : ''}</span>
        <div className="ml-auto inline-flex rounded-lg border border-line bg-surface p-0.5">
          {(['newest', 'oldest'] as Order[]).map((o) => (
            <button key={o} onClick={() => pickOrder(o)} aria-pressed={order === o}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold transition ${order === o ? 'bg-[var(--accent-soft)] text-accent' : 'text-dim hover:text-ink'}`}>
              {o === 'newest' ? <ArrowDownWideNarrow size={12} /> : <ArrowUpNarrowWide size={12} />} {o === 'newest' ? 'Newest first' : 'Oldest first'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {shown.map((m) => <MessageCard key={m.id} m={m} counterpart={thread.counterpart} latest={m.id === latestId && messages.length > 1} copies={thread.copies[m.id] || 0} />)}
        <div ref={endRef} />
      </div>
      {log.modals}
    </Drawer>
  );
}

/** Plain email text with its web links clickable (opens in a new tab). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"')\]]+)/g);
  return <>{parts.map((p, i) => (i % 2 === 1
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline break-all">{p}</a>
    : p))}</>;
}

/** One message. A reply shows what they wrote now; the quoted history opens on demand. */
function MessageCard({ m, counterpart, latest, copies }: { m: Message; counterpart: string; latest: boolean; copies: number }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const inbound = m.direction === 'inbound';
  const meta = (m.ai_meta || {}) as { html?: string; attachments?: string[]; summary?: string; manual?: boolean; delivery?: string; cancelled?: boolean; bounce?: { reason?: string | null } };
  const { fresh, quoted } = meta.html ? { fresh: '', quoted: '' } : splitQuoted(m.body);
  return (
    <div className={`rounded-2xl border p-3.5 ${inbound ? 'border-line bg-surface' : 'border-[var(--accent-soft)] bg-[var(--accent-soft)]/40'} ${latest ? 'ring-2 ring-[var(--accent-soft)]' : ''}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
        <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: inbound ? 'var(--green-soft)' : 'var(--accent-soft)', color: inbound ? 'var(--green)' : 'var(--accent)' }}>
          {inbound ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
        </span>
        <span className="font-bold text-ink">{inbound ? (m.from_email || counterpart) : 'You'}</span>
        <span className="text-faint">{inbound ? 'wrote' : `to ${m.to_email || counterpart}`}</span>
        {!inbound && !meta.manual && <span className="rounded px-1 text-[10px] font-bold uppercase" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>agent</span>}
        {latest && <span className="rounded px-1 text-[10px] font-bold uppercase" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>latest</span>}
        {copies > 0 && <span className="rounded px-1 text-[10px] font-bold uppercase" title={`The same email is stored ${copies + 1} times — shown once`} style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>×{copies + 1}</span>}
        {m.status === 'failed' && (
          <span className="rounded px-1 text-[10px] font-bold uppercase" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}
            title={meta.bounce?.reason || undefined}>
            {meta.delivery === 'bounced' ? 'bounced' : meta.delivery === 'complained' ? 'marked as spam' : meta.cancelled ? 'cancelled' : 'failed'}
          </span>
        )}
        <span className="ml-auto text-faint" title={new Date(m.sent_at || m.created_at).toLocaleString()}>{relTime(m.sent_at || m.created_at)}</span>
      </div>
      {m.subject && <div className="text-[13px] font-semibold text-ink">{m.subject}</div>}
      {meta.html
        ? <div className="rte-preview mt-1 text-ink" dangerouslySetInnerHTML={{ __html: meta.html }} />
        : <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink"><Linkified text={fresh} /></div>}
      {quoted && (
        <div className="mt-2">
          <button onClick={() => setShowQuoted((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-dim hover:text-ink">
            {showQuoted ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showQuoted ? 'Hide earlier messages' : 'Show earlier messages (quoted)'}
          </button>
          {showQuoted && <div className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 text-[12.5px] leading-relaxed text-dim">{quoted}</div>}
        </div>
      )}
      {meta.attachments && meta.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{meta.attachments.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-dim"><Paperclip size={10} /> {a}</span>)}</div>}
      {meta.summary && inbound && <div className="aibox mt-2 !p-2.5"><div className="aihead !mb-1 !text-[10.5px]"><Sparkles size={11} /> Agent read</div><p className="text-[12.5px] text-ink">{meta.summary}</p></div>}
    </div>
  );
}
