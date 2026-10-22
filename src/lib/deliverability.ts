import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelScheduledEmail } from '@/lib/email/resend';
import type { Lead, LeadData, EmailProblem } from '@/lib/types';

/**
 * Bounces and spam complaints.
 *
 * Resend tells us (webhook `email.bounced` / `email.complained`, or the email's
 * `last_event` when we ask) that a sent email bounced or was marked as spam.
 * Mailing that address again hurts the sender's reputation, so:
 *   - spam complaint            → lead Disqualified, follow-ups stop
 *   - hard bounce, no phone     → lead Disqualified, follow-ups stop
 *   - hard bounce, has a phone  → stays in the pipeline for calling; no more email
 *   - soft bounce (mailbox full, temporary) → only noted
 * The address is remembered on the lead (data.email_status) and the message, and
 * every send path refuses it (`blockedAddresses`). A new primary email clears it.
 */

const norm = (v: string | null | undefined) => {
  const s = String(v || '').trim().toLowerCase();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim();
};

/** The email problem that still applies to this lead's current address, if any. */
export function emailBlocked(lead: Pick<Lead, 'email' | 'data'> | null | undefined): EmailProblem | null {
  const st = (lead?.data as LeadData | null | undefined)?.email_status;
  if (!st || !lead?.email) return null;
  return norm(st.email) === norm(lead.email) ? st : null;
}

export function problemLabel(p: EmailProblem): string {
  return p.status === 'complained' ? 'marked our email as spam' : 'email bounced';
}

/** Resend's latest event for a sent email ("delivered", "bounced", "complained", …). */
export async function resendLastEvent(apiKey: string, resendId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(resendId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;
    const j = (await res.json()) as { last_event?: string };
    return j.last_event || null;
  } catch { return null; }
}

/** Addresses we must not email again (bounced / complained), from leads and from sent messages. */
export async function blockedAddresses(db: SupabaseClient, ownerId: string, emails: string[]): Promise<Map<string, EmailProblem>> {
  const list = [...new Set(emails.map(norm).filter((e) => e.includes('@')))].slice(0, 500);
  const out = new Map<string, EmailProblem>();
  if (!list.length) return out;
  const [{ data: leads }, { data: msgs }] = await Promise.all([
    db.from('leads').select('email, data').eq('owner_id', ownerId).in('email', list).not('data->email_status', 'is', null),
    db.from('messages').select('to_email, ai_meta, created_at').eq('owner_id', ownerId).eq('direction', 'outbound').in('to_email', list).in('ai_meta->>delivery', ['bounced', 'complained']),
  ]);
  for (const m of (msgs || []) as { to_email: string; ai_meta: { delivery?: string; bounce?: { at?: string; reason?: string } } | null; created_at: string }[]) {
    const status = m.ai_meta?.delivery === 'complained' ? 'complained' : 'bounced';
    out.set(norm(m.to_email), { status, email: norm(m.to_email), at: m.ai_meta?.bounce?.at || m.created_at, reason: m.ai_meta?.bounce?.reason });
  }
  for (const l of (leads || []) as Pick<Lead, 'email' | 'data'>[]) {
    const p = emailBlocked(l);
    if (p) out.set(norm(l.email), p);
  }
  return out;
}

export interface SentMessage { id: string; owner_id: string; lead_id: string | null; project_id: string; to_email: string | null; ai_meta: Record<string, unknown> | null }
export type ProblemAction = 'disqualified' | 'email_stopped' | 'noted' | 'soft';

/**
 * Record a bounce / complaint for one sent message and act on its lead.
 * `apiKey` (optional) cancels the lead's drip emails that have not gone out yet.
 */
export async function applyDeliveryProblem(
  db: SupabaseClient,
  msg: SentMessage,
  p: { kind: 'bounced' | 'complained'; address?: string | null; bounceType?: string | null; reason?: string | null; apiKey?: string | null },
): Promise<ProblemAction> {
  const at = new Date().toISOString();
  const address = norm(p.address || msg.to_email);
  const soft = p.kind === 'bounced' && /transient|temporary|soft|undetermined/i.test(p.bounceType || '');
  const bounce = { type: p.bounceType || null, reason: (p.reason || '').slice(0, 300) || null, at, address };

  if (soft) {
    await db.from('messages').update({ ai_meta: { ...(msg.ai_meta || {}), delivery: 'soft_bounce', bounce } }).eq('id', msg.id);
    await db.from('activity_log').insert({ owner_id: msg.owner_id, project_id: msg.project_id, kind: 'email', message: `Temporary delivery problem for ${address} (${p.reason || p.bounceType || 'soft bounce'}) — nothing changed`, meta: { messageId: msg.id, soft: true } });
    return 'soft';
  }

  await db.from('messages').update({ status: 'failed', ai_meta: { ...(msg.ai_meta || {}), delivery: p.kind, bounce } }).eq('id', msg.id);

  let action: ProblemAction = 'noted';
  let lead: Lead | null = null;
  if (msg.lead_id) {
    const { data } = await db.from('leads').select('*').eq('id', msg.lead_id).maybeSingle();
    lead = (data as Lead | null) || null;
  }
  // only act when the problem is with the lead's current address (or they complained)
  if (lead && (p.kind === 'complained' || !lead.email || norm(lead.email) === address)) {
    const d = (lead.data || {}) as LeadData;
    const problem: EmailProblem = { status: p.kind, email: address, at, reason: bounce.reason || undefined };
    const hasPhone = String(lead.phone || '').replace(/\D/g, '').length >= 6;
    const disqualify = p.kind === 'complained' || !hasPhone;
    const tag = p.kind === 'complained' ? 'spam-complaint' : 'bounced';
    const patch: Record<string, unknown> = {
      data: { ...d, email_status: problem }, updated_at: at,
      tags: [...new Set([...(lead.tags || []), tag])],
    };
    if (disqualify) { patch.stage = 'lost'; patch.next_action_at = null; }
    await db.from('leads').update(patch).eq('id', lead.id);
    action = disqualify ? 'disqualified' : 'email_stopped';

    // drip emails to this lead that Resend still holds
    if (p.apiKey) {
      const { data: queued } = await db.from('messages').select('id, provider_message_id, scheduled_at').eq('lead_id', lead.id).eq('status', 'scheduled');
      for (const q of (queued || []) as { id: string; provider_message_id: string | null; scheduled_at: string | null }[]) {
        if (q.provider_message_id && await cancelScheduledEmail(p.apiKey, q.provider_message_id).catch(() => false)) {
          await db.from('messages').update({ status: 'failed', ai_meta: { cancelled: true, scheduled_at: q.scheduled_at, reason: tag } }).eq('id', q.id);
        }
      }
    }
  }

  const who = lead?.company_name || address;
  const what = p.kind === 'complained' ? `${who} marked our email as spam` : `Email to ${address} bounced${bounce.reason ? ` (${bounce.reason.slice(0, 120)})` : ''}`;
  const then = action === 'disqualified' ? ' — lead disqualified, follow-ups stopped' : action === 'email_stopped' ? ' — no more email, call them instead' : '';
  await db.from('activity_log').insert({ owner_id: msg.owner_id, project_id: msg.project_id, kind: 'email', message: `${what}${then}`, meta: { messageId: msg.id, leadId: lead?.id || null, kind: p.kind, action, auto: true } });
  return action;
}

/**
 * Before emailing a lead again: ask Resend how the last email to them ended.
 * Returns the problem (and records it) when it bounced or was marked as spam.
 */
export async function checkLastEmail(db: SupabaseClient, apiKey: string, lead: Lead): Promise<ProblemAction | null> {
  const { data } = await db.from('messages').select('id, owner_id, lead_id, project_id, to_email, ai_meta, provider_message_id')
    .eq('lead_id', lead.id).eq('direction', 'outbound').eq('status', 'sent').not('provider_message_id', 'is', null)
    .order('sent_at', { ascending: false, nullsFirst: false }).limit(1);
  const last = ((data || [])[0] as (SentMessage & { provider_message_id: string }) | undefined);
  if (!last || (last.ai_meta as { delivery?: string } | null)?.delivery) return null;
  const ev = await resendLastEvent(apiKey, last.provider_message_id);
  if (ev !== 'bounced' && ev !== 'complained') return null;
  return applyDeliveryProblem(db, last, { kind: ev, address: last.to_email, apiKey });
}
