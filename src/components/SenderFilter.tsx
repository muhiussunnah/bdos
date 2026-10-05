'use client';

import { useEffect, useState } from 'react';
import { AtSign } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { sendersFrom } from '@/lib/email/resend';

/** "All emails" — every sending identity on the account. */
export const ALL_SENDERS = 'all';

/** "Name <a@b.c>" → "a@b.c" (lower-case). */
export function addressOf(raw?: string | null): string {
  const s = String(raw || '').split(/[,;]/)[0].trim().toLowerCase();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim();
}

/** The account side of a message: our From on sent mail, our To on received mail. */
export function ownAddressOf(m: { direction: string; from_email: string | null; to_email: string | null }): string {
  return addressOf(m.direction === 'outbound' ? m.from_email : m.to_email);
}

export function messageMatchesSender(m: { direction: string; from_email: string | null; to_email: string | null }, addr: string): boolean {
  return addr === ALL_SENDERS || ownAddressOf(m) === addr;
}

/** Remembers the chosen account per page. */
export function useSenderFilter(name: string): [string, (v: string) => void] {
  const [value, setValue] = useState(ALL_SENDERS);
  useEffect(() => { try { const v = localStorage.getItem(`klientic.sender.${name}`); if (v) setValue(v); } catch { /* ignore */ } }, [name]);
  const set = (v: string) => { setValue(v); try { localStorage.setItem(`klientic.sender.${name}`, v); } catch { /* ignore */ } };
  return [value, set];
}

/**
 * "All emails ▾" — pick one of the account's sending addresses to see only the
 * mail sent from (and replies received at) that address. `seen` adds addresses
 * found in the history that are no longer configured.
 */
export function SenderFilter({ value, onChange, seen = [] }: { value: string; onChange: (v: string) => void; seen?: string[] }) {
  const { settings } = useApp();
  const senders = sendersFrom(settings);
  const known = new Set(senders.map((s) => s.email.trim().toLowerCase()));
  const others = [...new Set(seen.map((e) => e.toLowerCase()).filter((e) => e.includes('@') && !known.has(e)))].sort();
  const active = value !== ALL_SENDERS;
  return (
    <div className={`flex items-center gap-1.5 rounded-[11px] border bg-surface px-2.5 py-1.5 ${active ? 'border-accent' : 'border-line'}`} title="Only show email sent from, and replies received at, this address">
      <AtSign size={14} className={active ? 'text-accent' : 'text-faint'} />
      <select className="max-w-[230px] bg-transparent text-[12.5px] font-semibold text-ink outline-none" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Email account">
        <option value={ALL_SENDERS}>All emails</option>
        {senders.map((s) => <option key={s.id} value={s.email.trim().toLowerCase()}>{s.email}{s.isDefault ? ' · default' : ''}</option>)}
        {others.length > 0 && <optgroup label="Also in history">{others.map((e) => <option key={e} value={e}>{e}</option>)}</optgroup>}
      </select>
    </div>
  );
}
