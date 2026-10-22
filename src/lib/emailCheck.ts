/**
 * Email address checks before a lead enters the pipeline (import, Find with AI).
 *
 * Free, edge-safe checks — no mail is sent:
 *   1. shape: one @, a real-looking domain with a letter TLD, no ".." etc.
 *   2. placeholders and fakes: example.com, test@, noreply@, "your.email@…"
 *   3. throw-away mailboxes: mailinator, yopmail, 10minutemail, …
 *   4. typos of the big providers: gmial.com → gmail.com is fixed, "x.con" is flagged
 *   5. DNS (DNS-over-HTTPS): the domain must exist and accept mail (MX, or an A record;
 *      a "null MX" means it never receives mail)
 * Whether the exact mailbox exists needs a paid verifier; hard bounces after the first
 * send are caught by the bounce handling instead (lib/deliverability.ts).
 */

export type DomainStatus = 'ok' | 'nodomain' | 'nomail' | 'unknown';
export interface EmailVerdict {
  /** the address to use (typo-fixed), or null when it should not be used */
  email: string | null;
  ok: boolean;
  /** why it was rejected */
  reason?: string;
  /** set when a known provider typo was corrected */
  fixedFrom?: string;
  /** DNS could not be checked in time — kept */
  unchecked?: boolean;
}

const SHAPE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

const PLACEHOLDER_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'example.se', 'test.com', 'test.se', 'domain.com', 'yourdomain.com', 'yourcompany.com',
  'company.com', 'email.com', 'sample.com', 'foo.com', 'bar.com', 'invalid.com', 'website.com', 'mydomain.com', 'acme.com',
]);
const PLACEHOLDER_LOCALS = /^(test|testing|example|sample|demo|noreply|no-reply|no\.reply|donotreply|do-not-reply|do\.not\.reply|asdf|qwerty|abc|abcd|xxx+|aaa+|null|none|na|n\/a|unknown|email|e-?mail|your\.?email|youremail|your\.?name|yourname|name|firstname|first\.last|firstname\.lastname|user|username)$/;

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la',
  '10minutemail.com', '10minutemail.net', '10minutemail.co.uk', '20minutemail.com', 'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmailo.com',
  'tempail.com', 'tempr.email', 'tempinbox.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'trashmail.com', 'trashmail.de', 'trashmail.net', 'getnada.com', 'nada.email',
  'dispostable.com', 'maildrop.cc', 'mailnesia.com', 'mintemail.com', 'mohmal.com', 'throwawaymail.com', 'fakeinbox.com', 'discard.email', 'emailondeck.com',
  'spamgourmet.com', 'mytemp.email', 'burnermail.io', 'inboxkitten.com', 'mailcatch.com', 'moakt.com', 'getairmail.com', 'fakemail.net', 'mailpoof.com',
  'spambox.us', 'spam4.me', 'mailexpire.com', 'tempmailaddress.com', 'emailfake.com', 'crazymailing.com', 'mail-temp.com', 'luxusmail.org', 'dropmail.me',
]);

/** Misspelt big providers → the real domain (fixed automatically). */
const PROVIDER_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmal.com': 'gmail.com', 'gmali.com': 'gmail.com', 'gmailcom': 'gmail.com', 'gmail.comm': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotnail.com': 'hotmail.com', 'homail.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmial.se': 'hotmail.se', 'hotmai.se': 'hotmail.se', 'hotnail.se': 'hotmail.se',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outlook.co': 'outlook.com', 'otlook.com': 'outlook.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icloud.con': 'icloud.com', 'icoud.com': 'icloud.com',
  'live.con': 'live.com', 'liv.se': 'live.se',
};
const TLD_TYPOS: Record<string, string> = { con: 'com', cmo: 'com', comm: 'com', coom: 'com', ocm: 'com', vom: 'com', xom: 'com', cpm: 'com', cim: 'com' };

/** Checks that need no network. Returns the verdict, or `{ ok: true }` with the (fixed) address to DNS-check. */
export function quickCheck(raw: string | null | undefined): EmailVerdict {
  let email = String(raw || '').trim().toLowerCase().replace(/^mailto:/, '').replace(/[.,;:]+$/, '');
  if (!email) return { email: null, ok: false, reason: 'No email' };
  if (!SHAPE.test(email) || email.includes('..') || email.split('@')[0].length > 64) return { email: null, ok: false, reason: `Not a valid email address "${email}"` };
  const [local, typed] = email.split('@');
  let domain = typed;
  let fixedFrom: string | undefined;
  if (PROVIDER_TYPOS[domain]) { fixedFrom = email; domain = PROVIDER_TYPOS[domain]; email = `${local}@${domain}`; }
  const tld = domain.split('.').pop() || '';
  if (TLD_TYPOS[tld]) {
    return { email: null, ok: false, reason: `Looks like a typo: "${domain}" (did you mean .${TLD_TYPOS[tld]}?)` };
  }
  if (PLACEHOLDER_DOMAINS.has(domain)) return { email: null, ok: false, reason: `Placeholder address "${email}"` };
  if (PLACEHOLDER_LOCALS.test(local)) return { email: null, ok: false, reason: `Not a real inbox "${email}"` };
  if (DISPOSABLE.has(domain)) return { email: null, ok: false, reason: `Throw-away mailbox "${email}"` };
  return { email, ok: true, fixedFrom };
}

// ── DNS ─────────────────────────────────────────────────────────────────────

interface DohAnswer { type: number; data: string }
interface DohReply { Status: number; Answer?: DohAnswer[] }

async function doh(name: string, type: 'MX' | 'A', ms: number): Promise<DohReply | null> {
  const urls = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  ];
  for (const url of urls) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: ctl.signal });
      if (res.ok) {
        const j = (await res.json()) as DohReply;
        if (j.Status === 0 || j.Status === 3) return j; // NOERROR / NXDOMAIN are answers; SERVFAIL → try the next resolver
      }
    } catch { /* timeout / network → next resolver */ }
    finally { clearTimeout(t); }
  }
  return null;
}

/** Does this domain exist and accept mail? */
export async function domainStatus(domain: string, ms = 4000): Promise<DomainStatus> {
  const mx = await doh(domain, 'MX', ms);
  if (!mx) return 'unknown';
  if (mx.Status === 3) return 'nodomain';
  const records = (mx.Answer || []).filter((a) => a.type === 15).map((a) => a.data.trim());
  if (records.length) {
    // RFC 7505 "null MX" (0 .) = this domain never receives mail
    return records.every((r) => /^\d+\s+\.?$/.test(r)) ? 'nomail' : 'ok';
  }
  // no MX: mail goes to the A record if there is one
  const a = await doh(domain, 'A', ms);
  if (!a) return 'unknown';
  return (a.Answer || []).some((x) => x.type === 1) ? 'ok' : a.Status === 3 ? 'nodomain' : 'nomail';
}

/** Check many domains with limited parallelism and an overall time budget (unfinished → unknown). */
export async function domainStatuses(domains: string[], { concurrency = 24, budgetMs = 15000 } = {}): Promise<Map<string, DomainStatus>> {
  const out = new Map<string, DomainStatus>();
  const queue = [...new Set(domains.filter(Boolean))];
  const deadline = Date.now() + budgetMs;
  let i = 0;
  const worker = async () => {
    while (i < queue.length) {
      const d = queue[i++];
      const left = deadline - Date.now();
      if (left < 300) { out.set(d, 'unknown'); continue; }
      out.set(d, await domainStatus(d, Math.min(4000, left)).catch(() => 'unknown' as DomainStatus));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

const DOMAIN_REASON: Record<Exclude<DomainStatus, 'ok' | 'unknown'>, string> = {
  nodomain: 'the domain does not exist',
  nomail: 'the domain does not receive email',
};

/**
 * Full check for a list of addresses (duplicates are fine). Big providers skip DNS.
 * Returns a verdict per input address (keyed by the trimmed lower-case input).
 */
export async function verifyEmails(emails: (string | null | undefined)[], opts?: { budgetMs?: number }): Promise<Map<string, EmailVerdict>> {
  const verdicts = new Map<string, EmailVerdict>();
  const toResolve: string[] = [];
  for (const raw of emails) {
    const key = String(raw || '').trim().toLowerCase();
    if (!key || verdicts.has(key)) continue;
    const v = quickCheck(key);
    verdicts.set(key, v);
    if (v.ok && v.email) {
      const d = v.email.split('@')[1];
      if (!KNOWN_GOOD.has(d)) toResolve.push(d);
    }
  }
  const status = await domainStatuses(toResolve, { budgetMs: opts?.budgetMs ?? 15000 });
  for (const [key, v] of verdicts) {
    if (!v.ok || !v.email) continue;
    const s = status.get(v.email.split('@')[1]);
    if (s === 'nodomain' || s === 'nomail') verdicts.set(key, { email: null, ok: false, reason: `${v.email}: ${DOMAIN_REASON[s]}` });
    else if (s === 'unknown') verdicts.set(key, { ...v, unchecked: true });
  }
  return verdicts;
}

/** Big mailbox providers — always receive mail, no need to look them up. */
const KNOWN_GOOD = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.se', 'outlook.com', 'outlook.se', 'live.com', 'live.se', 'msn.com', 'yahoo.com', 'yahoo.se',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.com', 'gmx.de', 'proton.me', 'protonmail.com', 'telia.com', 'bredband.net', 'comhem.se',
]);
