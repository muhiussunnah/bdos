import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getReceivedEmail, htmlToText } from '@/lib/email/resend';
import { resolveAI, knowledgeFor } from '@/lib/ai/resolve';
import { completeJSON } from '@/lib/ai/providers';
import { classifyPrompt } from '@/lib/ai/prompts';
import type { Project, Lead, ReplyCategory } from '@/lib/types';

export const runtime = 'edge';

/**
 * Resend inbound webhook (`email.received`).
 *
 * Replies to the user's sending address (e.g. support@klientic.com) are
 * received by Resend and pushed here. We:
 *   1. work out which Klientic user owns the recipient address,
 *   2. fetch the full message from Resend with THAT user's API key — this
 *      doubles as authentication: a forged event can never resolve to a real
 *      email in the owner's account (a Svix signature check runs too when
 *      RESEND_WEBHOOK_SECRET is set),
 *   3. link it to the matching lead, store it in the Inbox,
 *   4. let the agent classify it right away (best effort).
 */

interface ReceivedEvent {
  type: string;
  data: { email_id: string; from: string; to: string[]; received_for?: string[]; subject?: string; message_id?: string; attachments?: { filename: string }[] };
}

interface Classification {
  category: ReplyCategory; confidence: number; needs_human: boolean; summary: string;
  draft: { subject: string; body: string } | null;
}

const ignore = (reason: string) => NextResponse.json({ ok: true, ignored: reason });

export async function POST(req: Request) {
  const raw = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const valid = await verifySvix(raw, req.headers, secret).catch(() => false);
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ReceivedEvent;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  if (event?.type !== 'email.received' || !event.data?.email_id) return ignore('not an inbound email event');

  const admin = createAdminClient();
  const emailId = event.data.email_id;
  const recipients = [...(event.data.to || []), ...(event.data.received_for || [])].map((a) => extractAddress(a));

  // 1. which user owns the recipient address?
  const { data: settingsRows } = await admin.from('user_settings').select('owner_id, from_email').not('from_email', 'is', null);
  const owner = pickOwner((settingsRows || []) as { owner_id: string; from_email: string }[], recipients);
  if (!owner) return ignore('no user with this sending address');

  // 2. fetch the full email with the owner's key (also proves the event is genuine)
  const { data: secretRow } = await admin.from('user_secrets').select('api_key').eq('owner_id', owner).eq('provider', 'resend').maybeSingle();
  const apiKey = secretRow?.api_key || process.env.RESEND_API_KEY || '';
  if (!apiKey) return ignore('owner has no Resend key');
  const mail = await getReceivedEmail(apiKey, emailId).catch(() => null);
  if (!mail) return ignore('email not found in owner account');

  // de-dupe (Resend retries webhooks)
  const { data: dup } = await admin.from('messages').select('id').eq('owner_id', owner).eq('provider_message_id', emailId).maybeSingle();
  if (dup) return NextResponse.json({ ok: true, duplicate: true, messageId: dup.id });

  const sender = extractAddress(mail.from || event.data.from || '');
  if (!sender) return ignore('no sender');
  // never loop on our own bounces / auto-replies from ourselves
  if (recipients.includes(sender)) return ignore('self-addressed');
  // skip machine mail that is never a prospect reply (DMARC aggregate reports,
  // mailer-daemon bounces, newsletter blasts to the support address)
  if (isAutomatedSender(sender, mail.subject || event.data.subject || '')) return ignore('automated sender');

  // 3. link to a lead (most recently contacted first)
  const { data: leadRows } = await admin.from('leads').select('*').eq('owner_id', owner).ilike('email', sender)
    .order('last_contacted_at', { ascending: false, nullsFirst: false }).limit(1);
  const lead = ((leadRows || [])[0] as Lead | undefined) || null;

  let projectId = lead?.project_id || null;
  if (!projectId) {
    const { data: projects } = await admin.from('projects').select('id, is_default').eq('owner_id', owner).order('created_at');
    projectId = (projects || []).find((p) => p.is_default)?.id || (projects || [])[0]?.id || null;
  }
  if (!projectId) return ignore('owner has no project');

  const body = (mail.text && mail.text.trim()) || htmlToText(mail.html || '') || '(empty message)';
  const subject = mail.subject || event.data.subject || null;
  const attachments = (mail.attachments || []).map((a) => a.filename).filter(Boolean);

  const { data: created, error } = await admin.from('messages').insert({
    project_id: projectId, owner_id: owner, lead_id: lead?.id || null,
    direction: 'inbound', status: 'received', subject, body: body.slice(0, 20000),
    from_email: sender, to_email: recipients[0] || null, provider_message_id: emailId,
    ai_meta: { source: 'resend', message_id: mail.message_id || event.data.message_id || null, attachments, headers_from: mail.headers?.from || null },
  }).select('id').single();
  if (error || !created) return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 });

  if (lead) {
    await admin.from('leads').update({ next_action_at: null, updated_at: new Date().toISOString() }).eq('id', lead.id);
  }

  // 4. best-effort auto-classification
  let category: string | null = null;
  try {
    const { data: project } = await admin.from('projects').select('*').eq('id', projectId).single();
    const P = project as Project;
    const [ai, knowledge] = await Promise.all([resolveAI(admin, owner, P?.ai_model), knowledgeFor(admin, projectId)]);
    if (ai.apiKey) {
      const { system, user } = classifyPrompt(P, lead, body, knowledge);
      const c = await completeJSON<Classification>({ ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.3, maxTokens: 900 });
      await admin.from('messages').update({
        category: c.category, needs_human: c.needs_human,
        ai_meta: { source: 'resend', message_id: mail.message_id || null, attachments, confidence: c.confidence, summary: c.summary, draft: c.draft },
      }).eq('id', created.id);
      category = c.category;
      if (lead && ['positive', 'interested', 'meeting_request'].includes(c.category)) {
        await admin.from('leads').update({ stage: c.category === 'meeting_request' ? 'meeting' : 'positive', next_action_at: null }).eq('id', lead.id);
      }
    }
  } catch {
    // leave unclassified; the user can hit "Classify" in the Inbox
  }

  await admin.from('activity_log').insert({
    owner_id: owner, project_id: projectId, kind: 'inbox',
    message: `Reply received from ${lead?.company_name || sender}${category ? ` · ${category}` : ''}`,
    meta: { messageId: created.id, leadId: lead?.id || null, auto: true },
  });

  return NextResponse.json({ ok: true, messageId: created.id, leadId: lead?.id || null, category });
}

/** Resend pings the URL when you register it; answer politely. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'resend inbound webhook' });
}

// ── helpers ─────────────────────────────────────────────────────────────────

function extractAddress(v: string): string {
  const m = v.match(/<([^>]+)>/);
  return (m ? m[1] : v).trim().toLowerCase();
}

function isAutomatedSender(sender: string, subject: string): boolean {
  const local = sender.split('@')[0] || '';
  if (/^(no-?reply|noreply-[\w-]*|do-?not-?reply|mailer-daemon|postmaster|bounces?|dmarc[\w-]*|abuse|notifications?)$/i.test(local)) return true;
  if (/-replies@|^noreply-dmarc|dmarc-support|marketing-email/i.test(sender)) return true;
  if (/^report domain:/i.test(subject)) return true;
  return false;
}

function pickOwner(rows: { owner_id: string; from_email: string }[], recipients: string[]): string | null {
  const exact = rows.find((r) => recipients.includes(r.from_email.trim().toLowerCase()));
  if (exact) return exact.owner_id;
  const domains = new Set(recipients.map((a) => a.split('@')[1]).filter(Boolean));
  const byDomain = rows.find((r) => domains.has(r.from_email.split('@')[1]?.toLowerCase()));
  return byDomain?.owner_id || null;
}

/** Standard Svix signature check: HMAC-SHA256(`${id}.${ts}.${body}`) with the base64 secret after "whsec_". */
async function verifySvix(body: string, headers: Headers, secret: string): Promise<boolean> {
  const id = headers.get('svix-id'), ts = headers.get('svix-timestamp'), sigHeader = headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigHeader.split(' ').some((part) => part.split(',')[1] === expected);
}
