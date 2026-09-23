'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Paperclip, ArrowDownLeft, ArrowUpRight, Sparkles, CalendarCheck, Repeat, Trophy, ExternalLink, Trash2, Phone } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { Thread } from '@/lib/threads';
import type { Lead } from '@/lib/types';

/**
 * Gmail-style conversation view: every message exchanged with this lead,
 * oldest first, with a reply box at the bottom.
 */
export function ThreadDrawer({ thread, onClose, onChange, onMove, onOpenLead, onDelete, onDeleteThread }: {
  thread: Thread | null; onClose: () => void; onChange: () => void;
  onMove: (leadId: string | null, stage: 'meeting' | 'followup1' | 'closed') => void;
  onOpenLead: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onDeleteThread?: (threadKey: string) => void;
}) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setReply(''); setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 60); }, [thread?.key]);

  if (!thread) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const { lead, messages } = thread;
  const subjectBase = (messages.find((m) => m.subject)?.subject || '').replace(/^(re|sv|fwd?):\s*/i, '');
  const title = lead?.company_name || thread.counterpart || 'Conversation';

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
      toast.success('Reply sent'); setReply(''); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Send failed'); }
    finally { setBusy(false); }
  }

  return (
    <Drawer open onClose={onClose} title={title}
      sub={`${thread.counterpart}${lead?.contact_name ? ` · ${lead.contact_name}` : ''} · ${messages.length} message${messages.length === 1 ? '' : 's'}`}
      footer={
        <div className="space-y-2">
          <textarea className="input min-h-[96px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={thread.theirTurn ? 'Answer them…' : 'Send a follow-up…'} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={send} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply</button>
            <div className="ml-auto flex gap-1">
              <button onClick={() => onMove(thread.leadId, 'meeting')} disabled={!thread.leadId} title="Mark as booked meeting" className="btn btn-ghost btn-sm"><CalendarCheck size={14} /> Booked</button>
              <button onClick={() => onMove(thread.leadId, 'followup1')} disabled={!thread.leadId} title="Mark as follow-up" className="btn btn-ghost btn-sm"><Repeat size={14} /> Follow-up</button>
              <button onClick={() => onMove(thread.leadId, 'closed')} disabled={!thread.leadId} title="Mark as sold" className="btn btn-ghost btn-sm"><Trophy size={14} /> Sold</button>
              {thread.leadId
                ? (onDelete && <button onClick={() => onDelete(thread.leadId!)} title="Delete this lead" className="btn btn-ghost btn-sm !px-2 text-bad"><Trash2 size={14} /></button>)
                : (onDeleteThread && <button onClick={() => onDeleteThread(thread.key)} title="Delete this conversation" className="btn btn-ghost btn-sm !px-2 text-bad"><Trash2 size={14} /></button>)}
            </div>
          </div>
        </div>
      }>
      {lead && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-dim">
          <button onClick={() => onOpenLead(lead)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-ink">
            <span className="stagetag">{lead.stage.replace('followup', 'Follow-up ')}</span>
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
      <div className="space-y-3">
        {messages.map((m) => {
          const inbound = m.direction === 'inbound';
          const meta = (m.ai_meta || {}) as { html?: string; attachments?: string[]; summary?: string; manual?: boolean };
          return (
            <div key={m.id} className={`rounded-2xl border p-3.5 ${inbound ? 'border-line bg-surface' : 'border-[var(--accent-soft)] bg-[var(--accent-soft)]/40'}`}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: inbound ? 'var(--green-soft)' : 'var(--accent-soft)', color: inbound ? 'var(--green)' : 'var(--accent)' }}>
                  {inbound ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                </span>
                <span className="font-bold text-ink">{inbound ? (m.from_email || thread.counterpart) : 'You'}</span>
                <span className="text-faint">{inbound ? 'wrote' : `to ${m.to_email || thread.counterpart}`}</span>
                {!inbound && !meta.manual && <span className="rounded px-1 text-[10px] font-bold uppercase" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>agent</span>}
                {m.status === 'failed' && <span className="rounded px-1 text-[10px] font-bold uppercase" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>failed</span>}
                <span className="ml-auto text-faint" title={new Date(m.sent_at || m.created_at).toLocaleString()}>{relTime(m.sent_at || m.created_at)}</span>
              </div>
              {m.subject && <div className="text-[13px] font-semibold text-ink">{m.subject}</div>}
              {meta.html ? <div className="rte-preview mt-1 text-ink" dangerouslySetInnerHTML={{ __html: meta.html }} /> : <div className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{m.body}</div>}
              {meta.attachments && meta.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{meta.attachments.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-dim"><Paperclip size={10} /> {a}</span>)}</div>}
              {meta.summary && inbound && <div className="aibox mt-2 !p-2.5"><div className="aihead !mb-1 !text-[10.5px]"><Sparkles size={11} /> Agent read</div><p className="text-[12.5px] text-ink">{meta.summary}</p></div>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </Drawer>
  );
}
