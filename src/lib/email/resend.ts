import type { SupabaseClient } from '@supabase/supabase-js';

export interface SendArgs {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from: string;
  replyTo?: string;
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
      to: [args.to],
      subject: args.subject,
      ...(args.html ? { html: args.html } : {}),
      ...(args.text ? { text: args.text } : {}),
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return { id: data.id };
}

/** Resolve the user's Resend key + from-address (their key first, env fallback). */
export async function resolveEmail(supabase: SupabaseClient, ownerId: string) {
  const [{ data: secret }, { data: settings }] = await Promise.all([
    supabase.from('user_secrets').select('api_key, meta').eq('owner_id', ownerId).eq('provider', 'resend').maybeSingle(),
    supabase.from('user_settings').select('from_name, from_email').eq('owner_id', ownerId).maybeSingle(),
  ]);
  const apiKey = secret?.api_key || process.env.RESEND_API_KEY || '';
  const fromEmail = settings?.from_email || (secret?.meta as { from_email?: string })?.from_email;
  const fromName = settings?.from_name || 'Klientic';
  const from = fromEmail ? `${fromName} <${fromEmail}>` : process.env.RESEND_FROM || 'Klientic <onboarding@resend.dev>';
  return { apiKey, from };
}

export function textToHtml(text: string) {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#16121F">${esc.replace(/\n/g, '<br>')}</div>`;
}
