import { auth, bad, ok, logActivity } from '@/lib/api';
import { touchLeadAfterEmail, senderName } from '@/lib/email/afterSend';
import { resolveEmail, sendEmail, textToHtml, attachmentsFromForm, wrapEmailHtml, htmlToText, parseAddressList } from '@/lib/email/resend';
import { isEmail, renderTemplate, recipientVars } from '@/lib/csv';
import type { Project, Lead } from '@/lib/types';

export const runtime = 'edge';

interface Recipient { email: string; name?: string | null; company?: string | null; role?: string | null; website?: string | null; leadId?: string | null }
interface Payload {
  projectId: string; subject: string; body: string; html?: string; recipients: Recipient[]; startFollowups?: boolean; batchId?: string; fromId?: string | null; cc?: string; bcc?: string;
  /** Drip feed: one email every N minutes. `dripStartAt` + `dripOffset` keep chunked requests on one timeline. */
  dripMinutes?: number; dripStartAt?: string; dripOffset?: number;
}

const MAX_PER_REQUEST = 25;
/** Resend holds scheduled emails for at most 30 days. */
const MAX_AHEAD_MS = 30 * 86400000;

/**
 * Manual bulk send to a custom list (CSV rows or selected leads).
 * The client sends recipients in chunks (max 25 per request) so one edge
 * invocation never runs long. Subject/body support {{name}}, {{first_name}},
 * {{company}}, {{email}}, {{role}}, {{website}} and {{key|fallback}}.
 * multipart/form-data: payload (JSON string), files[]?
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const form = await req.formData().catch(() => null);
  if (!form) return bad('Expected multipart form data');
  let payload: Payload;
  try { payload = JSON.parse(String(form.get('payload') || '{}')); }
  catch { return bad('Invalid payload'); }

  const { projectId, subject, startFollowups = true, batchId } = payload;
  const cc = parseAddressList(payload.cc), bcc = parseAddressList(payload.bcc);
  const badCc = [...cc, ...bcc].find((a) => !isEmail(a));
  if (badCc) return bad(`"${badCc}" is not a valid email address`);
  const richHtml = (payload.html || '').trim();
  const body = richHtml ? htmlToText(richHtml) : (payload.body || '');
  const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
  if (!projectId) return bad('projectId is required');
  if (!subject?.trim() || (!body.trim() && !/<img/i.test(richHtml))) return bad('Subject and body are required');
  if (!recipients.length) return bad('No recipients');
  if (recipients.length > MAX_PER_REQUEST) return bad(`Send at most ${MAX_PER_REQUEST} recipients per request`);

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);
  const P = project as Project;

  const { apiKey, from } = await resolveEmail(supabase, userId, payload.fromId || null);
  if (!apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);

  let attachments;
  try { attachments = await attachmentsFromForm(form); }
  catch (e) { return bad(e instanceof Error ? e.message : 'Bad attachment', 413); }

  // hydrate any linked leads in one query
  const leadIds = recipients.map((r) => r.leadId).filter((x): x is string => !!x);
  const leadMap = new Map<string, Lead>();
  if (leadIds.length) {
    const { data } = await supabase.from('leads').select('*').in('id', leadIds).eq('project_id', projectId);
    (data as Lead[] || []).forEach((l) => leadMap.set(l.id, l));
  }

  const days = P.follow_up_days?.length ? P.follow_up_days : [3, 7, 21];
  const attachmentNames = (attachments || []).map((a) => a.filename);
  const results: { email: string; ok: boolean; error?: string }[] = [];

  // drip feed: slot 0 goes now, slot n goes at start + n × interval (Resend schedules it)
  const drip = Number(payload.dripMinutes) > 0 ? Math.max(1, Math.round(Number(payload.dripMinutes))) : 0;
  const dripStart = drip ? (Date.parse(payload.dripStartAt || '') || Date.now()) : 0;
  const dripOffset = Math.max(0, Math.floor(Number(payload.dripOffset) || 0));
  let scheduledCount = 0;

  for (const [i, r] of recipients.entries()) {
    const email = String(r.email || '').trim().toLowerCase();
    if (!isEmail(email)) { results.push({ email, ok: false, error: 'Invalid email' }); continue; }
    const slot = dripOffset + i;
    const at = drip && slot > 0 ? new Date(dripStart + slot * drip * 60000) : null;
    const scheduled = at && at.getTime() > Date.now() + 15000 ? at : null;
    if (scheduled && scheduled.getTime() - Date.now() > MAX_AHEAD_MS) {
      results.push({ email, ok: false, error: 'Too far ahead — Resend can schedule at most 30 days out. Use a shorter interval or fewer recipients.' });
      continue;
    }
    const lead = r.leadId ? leadMap.get(r.leadId) || null : null;
    const vars = recipientVars({
      email, name: r.name ?? lead?.contact_name, company: r.company ?? lead?.company_name,
      role: r.role ?? lead?.role, website: r.website ?? lead?.website,
    });
    const subj = renderTemplate(subject, vars);
    const text = renderTemplate(body, vars);
    const htmlOut = richHtml ? wrapEmailHtml(renderTemplate(richHtml, vars)) : textToHtml(text);
    const base = {
      lead_id: lead?.id || null, project_id: projectId, owner_id: userId, direction: 'outbound' as const,
      subject: subj, body: text, to_email: email, from_email: from,
      ai_meta: { manual: true, mode: 'bulk', batchId: batchId || null, attachments: attachmentNames, cc, bcc, ...(drip ? { drip } : {}), ...(richHtml ? { html: renderTemplate(richHtml, vars) } : {}) },
    };
    try {
      const sent = await sendEmail({ to: email, cc, bcc, subject: subj, html: htmlOut, text: text || subj, from, apiKey, attachments, scheduledAt: scheduled?.toISOString() });
      const whenIso = (scheduled || new Date()).toISOString();
      await supabase.from('messages').insert({
        ...base, provider_message_id: sent.id,
        status: scheduled ? 'scheduled' : 'sent', sent_at: scheduled ? null : whenIso, scheduled_at: scheduled ? whenIso : null,
      });
      if (scheduled) scheduledCount++;
      // a drip-fed lead counts as contacted at the moment its email actually goes out;
      // New → Outreach sent, queue leads → Follow-up with the next action one week out
      if (lead) await touchLeadAfterEmail(supabase, lead, { at: whenIso, subject: subj, by: senderName(from), startFollowups, followUpDays: days });
      results.push({ email, ok: true });
    } catch (e) {
      await supabase.from('messages').insert({ ...base, status: 'failed' });
      results.push({ email, ok: false, error: e instanceof Error ? e.message : 'Send failed' });
    }
  }

  const sentCount = results.filter((x) => x.ok).length;
  if (sentCount) {
    const what = drip ? `Drip-feed: ${sentCount} emails queued, one every ${drip} min` : `Bulk-sent ${sentCount} manual emails`;
    await logActivity(supabase, userId, projectId, 'outreach', what, { batchId, manual: true, drip: drip || null });
  }
  return ok({ sent: sentCount, scheduled: scheduledCount, failed: results.length - sentCount, results });
}
