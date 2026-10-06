'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Phone, Mail, PenLine, MessagesSquare, Check, ClipboardList } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Avatar } from '@/components/ui';
import { ThreeDot, type MenuItem } from '@/components/Menu';
import { CallResultModal, PrimaryContactModal, OwnerBadge, useSalesperson } from '@/components/sales/CallFlow';
import { stageLabel } from '@/lib/pipeline';
import { decisionMaker, nextLabel, lastActionLabel, callState, logCallStart, leadData, DUE_COLOR, DUE_SOFT } from '@/lib/sales';
import { relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';
import type { Thread } from '@/lib/threads';

/**
 * The front of a lead card: who to call, how, what happened last, what is next.
 *   CALL → logs the call, opens the dialer, then asks for the result.
 */
export function LeadFront({ lead, thread, onOpen, onWrite, menu, onChange, index = 0 }: {
  lead: Lead; thread: Thread | null; onOpen: (l: Lead) => void; onWrite: (l: Lead) => void; menu: MenuItem[]; onChange: () => void; index?: number;
}) {
  const { supabase } = useApp();
  const { by } = useSalesperson(lead);
  const [result, setResult] = useState(false);
  const [contact, setContact] = useState(false);
  const [calling, setCalling] = useState(false);

  const dm = decisionMaker(lead);
  const next = nextLabel(lead);
  const last = lastActionLabel(lead);
  const state = callState(lead);
  const d = leadData(lead);
  const tel = lead.phone ? lead.phone.replace(/[^\d+]/g, '') : '';
  const completed = d.last_action && (d.last_action.result === 'meeting' || d.last_action.result === 'not_interested');
  const accent = completed ? 'var(--green)' : next.due === 'none' ? 'transparent' : DUE_COLOR[next.due];

  async function call() {
    if (state === 'pending') { setResult(true); return; } // result still missing from the last call
    setCalling(true);
    try {
      await logCallStart(supabase, lead, by);
      if (tel) window.location.href = `tel:${tel}`;
      onChange();
      setResult(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not log the call'); }
    finally { setCalling(false); }
  }

  const callBtn = state === 'fresh'
    ? { cls: 'btn-accent', icon: <Phone size={14} />, text: 'Call' }
    : state === 'pending'
      ? { cls: '!bg-[var(--amber-soft)] !text-[var(--amber)] !border-[var(--amber)]', icon: <ClipboardList size={14} />, text: 'Log result' }
      : { cls: '!bg-[var(--green-soft)] !text-[var(--green)] !border-[var(--green)]', icon: <Check size={14} />, text: `Called${d.last_action ? ` ${new Date(d.last_action.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}` };

  return (
    <div className="card reveal relative !p-4 transition hover:-translate-y-0.5 hover:shadow-pop" style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, boxShadow: accent !== 'transparent' ? `inset 4px 0 0 ${accent}` : undefined }}>
      <div className="flex items-start gap-3">
        <Avatar name={lead.company_name} size={40} />
        <button onClick={() => onOpen(lead)} className="min-w-0 flex-1 text-left" title={thread ? 'Open the full conversation' : 'Open lead'}>
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-ink">{lead.company_name}</span>
            <span className={`stagetag s-${lead.stage} flex-none`}>{stageLabel(lead.stage)}</span>
          </div>
          {dm
            ? <div className="truncate text-[12.5px] font-semibold text-ink">👤 {dm}</div>
            : <div className="truncate text-[12.5px] italic text-faint">No decision maker yet</div>}
        </button>
        <OwnerBadge lead={lead} onChange={onChange} />
        <ThreeDot items={menu} />
      </div>

      <div className="mt-2 space-y-0.5 text-[12.5px]">
        <div className="flex items-center gap-1.5">
          <Mail size={12} className="flex-none text-faint" />
          {lead.email ? <a href={`mailto:${lead.email}`} className="truncate text-ink hover:text-accent">{lead.email}</a> : <span className="text-faint">no email</span>}
          <button onClick={() => setContact(true)} title="Set the decision maker as primary contact" className="grid h-6 w-6 flex-none place-items-center rounded-md text-faint transition hover:bg-[var(--accent-soft)] hover:text-accent"><PenLine size={12} /></button>
          {d.prev_emails?.length ? <span className="truncate text-[11px] text-faint" title={`Earlier: ${d.prev_emails.join(', ')}`}>was {d.prev_emails[d.prev_emails.length - 1]}</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Phone size={12} className="flex-none text-faint" />
          {lead.phone ? <a href={`tel:${tel}`} className="font-semibold text-ink hover:text-accent">{lead.phone}</a> : <span className="text-faint">no phone</span>}
        </div>
      </div>

      {last && <div className="mt-2 truncate text-[11.5px] text-dim" title={last}>Last: {last}</div>}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {next.text && (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: DUE_SOFT[next.due], color: DUE_COLOR[next.due] }}>
            {next.text}
          </span>
        )}
        {completed && !next.text && <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Check size={11} /> Done</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={call} disabled={calling} className={`btn btn-ghost btn-sm ${callBtn.cls}`} title={lead.phone ? `Call ${lead.phone} and log it` : 'Log a call (no phone number on this lead)'}>{callBtn.icon} {callBtn.text}</button>
          <button onClick={() => onWrite(lead)} disabled={!lead.email} className="btn btn-ghost btn-sm" title={lead.email ? `Email ${lead.email}` : 'No email on this lead'}><Mail size={13} /> Email</button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-faint">
        {thread ? <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-px font-semibold text-dim"><MessagesSquare size={11} /> {thread.messages.length} msg · {thread.inboundCount} from them</span> : <span>No messages yet</span>}
        {lead.last_contacted_at && <span className="ml-auto">Last contact {relTime(lead.last_contacted_at)}</span>}
      </div>

      <CallResultModal lead={lead} open={result} onClose={() => setResult(false)} onDone={onChange} />
      <PrimaryContactModal lead={lead} open={contact} onClose={() => setContact(false)} onDone={onChange} />
    </div>
  );
}
