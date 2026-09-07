import type { SupabaseClient } from '@supabase/supabase-js';

export interface Attachment {
  filename: string;
  /** base64-encoded file content */
  content: string;
  contentType?: string;
}

export interface SendArgs {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Attachment[];
  apiKey: string;
}

/** Send one email through Resend's REST API (edge-safe, no SDK needed). */
export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  if (!args.apiKey) throw new Error('No Resend API key. Add it in Settings → Email.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: args.from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      ...(args.html ? { html: args.html } : {}),
      ...(args.text ? { text: args.text } : {}),
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      ...(args.cc?.length ? { cc: args.cc } : {}),
      ...(args.bcc?.length ? { bcc: args.bcc } : {}),
      ...(args.attachments?.length
        ? { attachments: args.attachments.map((a) => ({ filename: a.filename, content: a.content, ...(a.contentType ? { content_type: a.contentType } : {}) })) }
        : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return { id: data.id };
}

export interface SenderIdentity { id: string; name: string; email: string; isDefault?: boolean }

/** All sending identities for a user: the saved list, or a synthesized one from from_name / from_email. */
export function sendersFrom(settings: { from_name?: string | null; from_email?: string | null; data?: Record<string, unknown> | null } | null | undefined): SenderIdentity[] {
  const raw = (settings?.data as { senders?: SenderIdentity[] } | undefined)?.senders;
  const list = Array.isArray(raw) ? raw.filter((s) => s && typeof s.email === 'string' && s.email.includes('@')) : [];
  if (list.length) {
    if (!list.some((s) => s.isDefault)) list[0].isDefault = true;
    return list;
  }
  if (settings?.from_email) return [{ id: 'legacy', name: settings.from_name || 'Klientic', email: settings.from_email, isDefault: true }];
  return [];
}

/**
 * Resolve the user's Resend key + from-address (their key first, env fallback).
 * Pass `senderId` to send from one of the user's non-default identities.
 */
export async function resolveEmail(supabase: SupabaseClient, ownerId: string, senderId?: string | null) {
  const [{ data: secret }, { data: settings }] = await Promise.all([
    supabase.from('user_secrets').select('api_key, meta').eq('owner_id', ownerId).eq('provider', 'resend').maybeSingle(),
    supabase.from('user_settings').select('from_name, from_email, data').eq('owner_id', ownerId).maybeSingle(),
  ]);
  const apiKey = secret?.api_key || process.env.RESEND_API_KEY || '';
  const senders = sendersFrom(settings);
  const chosen = (senderId && senders.find((s) => s.id === senderId)) || senders.find((s) => s.isDefault) || senders[0] || null;
  const fromEmail = chosen?.email || (secret?.meta as { from_email?: string })?.from_email;
  const fromName = chosen?.name || settings?.from_name || 'Klientic';
  const from = fromEmail ? `${fromName} <${fromEmail}>` : process.env.RESEND_FROM || 'Klientic <onboarding@resend.dev>';
  return { apiKey, from, sender: chosen, senders };
}

export function textToHtml(text: string) {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#16121F">${esc.replace(/\n/g, '<br>')}</div>`;
}

/** Max total attachment payload we accept per email (Resend allows 40MB; keep headroom for base64). */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/** Base64-encode a File in an edge runtime (no Buffer). */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Collect every `files` entry from a multipart form into Resend attachments. */
export async function attachmentsFromForm(form: FormData, field = 'files'): Promise<Attachment[]> {
  const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachments are too large (${(total / 1048576).toFixed(1)}MB). Keep the total under ${MAX_ATTACHMENT_BYTES / 1048576}MB.`);
  }
  const out: Attachment[] = [];
  for (const f of files) {
    out.push({ filename: f.name, content: await fileToBase64(f), contentType: f.type || undefined });
  }
  return out;
}

/** Split a comma / semicolon / newline separated address list. */
export function parseAddressList(v?: string | null): string[] {
  if (!v) return [];
  return v.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  message_id?: string | null;
  headers?: Record<string, string>;
  attachments?: { id: string; filename: string; content_type?: string; size?: number }[];
}

/** Fetch a received (inbound) email from Resend by id. */
export async function getReceivedEmail(apiKey: string, id: string): Promise<ReceivedEmail> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return res.json();
}

/** Very small HTML → text for inbound bodies (no DOM in the edge runtime). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Wrap rich-text editor HTML for email clients: base typography plus inline
 * styles on the elements Gmail/Outlook ignore stylesheets for.
 */
export function wrapEmailHtml(inner: string): string {
  const styled = inner
    .replace(/<table(?![^>]*style=)/gi, '<table style="border-collapse:collapse;width:100%"')
    .replace(/<(td|th)(?![^>]*style=)/gi, '<$1 style="border:1px solid #d9d6e0;padding:6px 10px"')
    .replace(/<blockquote(?![^>]*style=)/gi, '<blockquote style="margin:8px 0;padding:6px 14px;border-left:3px solid #c9c4d6;color:#4b4658"')
    .replace(/<pre(?![^>]*style=)/gi, '<pre style="background:#f3f1f7;padding:12px 14px;border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap"')
    .replace(/<img(?![^>]*style=)/gi, '<img style="max-width:100%;height:auto"')
    .replace(/<hr(?![^>]*style=)/gi, '<hr style="border:none;border-top:1px solid #d9d6e0;margin:16px 0"')
    .replace(/<a\s/gi, '<a style="color:#7c3aed" ');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16121F">${styled}</div>`;
}
