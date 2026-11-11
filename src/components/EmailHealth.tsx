'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Loader2, RefreshCw, ShieldCheck, ShieldAlert, Mail } from 'lucide-react';
import { Card, Thinking } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  emptyTally, mergeTally, resendRates, bounceTone, complaintTone,
  type HealthReport, type ResendTally,
} from '@/lib/emailHealth';

const pct = (x: number) => `${x < 0.1 && x > 0 ? x.toFixed(2) : x.toFixed(1)}%`;
const share = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const TONE = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' } as const;
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

function Tile({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: keyof typeof TONE }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="text-[11px] font-semibold text-dim">{label}</div>
      <div className={cn('mono mt-0.5 text-[20px] font-extrabold', tone ? TONE[tone] : 'text-ink')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

/** Account-wide sending health: lifetime numbers from Klientic + Resend's exact last 30 days. */
export default function EmailHealth() {
  const [r, setR] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [rs, setRs] = useState<ResendTally | null>(null);
  const [rsBusy, setRsBusy] = useState(false);
  const [rsDone, setRsDone] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/email-health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ part: 'klientic' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setR(data as HealthReport);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not load email health'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function checkResend() {
    setRsBusy(true); setRsDone(false);
    let all = emptyTally(), after: string | null = null;
    try {
      for (let i = 0; i < 40; i++) {
        const res: Response = await fetch('/api/reports/email-health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ part: 'resend', after }) });
        const data = await res.json() as { error?: string; tally: ResendTally; next: string | null };
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        all = mergeTally(all, data.tally as ResendTally);
        setRs(all);
        after = data.next;
        if (!after) break;
      }
      setRsDone(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Resend check failed'); }
    finally { setRsBusy(false); }
  }

  async function applyMissing() {
    if (!rs?.unrecorded.length) return;
    setApplying(true);
    try {
      let applied = 0;
      const ids = rs.unrecorded.map((u) => u.id);
      for (let i = 0; i < ids.length; i += 60) {
        const res = await fetch('/api/reports/email-health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ part: 'apply', ids: ids.slice(i, i + 60) }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        applied += data.applied || 0;
      }
      toast.success(`${applied} address${applied === 1 ? '' : 'es'} marked — Klientic will not email ${applied === 1 ? 'it' : 'them'} again`);
      setRs({ ...rs, unrecorded: [] });
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setApplying(false); }
  }

  if (loading && !r) return <Card><Thinking label="Counting every email you have sent…" /></Card>;
  if (!r) return null;

  const bPct = share(r.bounced, r.sent), cPct = share(r.complained, r.sent);
  const replyPct = share(r.leadsReplied, r.leadsEmailed);
  const busiest = r.days.busiest;
  const dayTone = (n: number): keyof typeof TONE => (n > 100 ? 'bad' : n > 85 ? 'warn' : 'ok');
  const rr = rs ? resendRates(rs) : null;
  const senders = rs ? Object.entries(rs.byFrom).sort((a, b) => Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0)) : [];

  return (
    <Card>
      <div className="card-h">
        <h3 className="flex items-center gap-1.5"><Activity size={15} /> Email health</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-faint">All projects · all senders{r.firstSent ? ` · since ${new Date(r.firstSent).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</span>
          <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm !px-2.5" title="Refresh">{loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}</button>
        </div>
      </div>

      {/* lifetime */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Emails sent (lifetime)" value={r.sent.toLocaleString()} sub={`${r.recipients.toLocaleString()} different addresses`} />
        <Tile label="Bounce rate" value={pct(bPct)} tone={bounceTone(bPct)} sub={`${r.bounced} bounced · Resend limit 4%`} />
        <Tile label="Spam complaints" value={pct(cPct)} tone={complaintTone(cPct)} sub={`${r.complained} reported · limit 0.08%`} />
        <Tile label="Reply rate" value={pct(replyPct)} sub={`${r.leadsReplied} of ${r.leadsEmailed} leads answered`} />
        <Tile label="Busiest day" value={busiest ? busiest.sent : 0} tone={busiest ? dayTone(busiest.sent) : undefined} sub={busiest ? dayLabel(busiest.day) : '—'} />
        <Tile label="Average per sending day" value={r.days.avgPerDay} sub={`${r.days.sendingDays} days with sends`} />
      </div>

      <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Last 7 days · Resend Free plan stops at 100 a day (all senders together)</div>
          <div className="grid grid-cols-7 gap-1.5">
            {r.days.last7.map((d) => (
              <div key={d.day} className="rounded-lg border border-line bg-surface-2 p-1.5 text-center">
                <div className="text-[10px] text-faint">{new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div className={cn('mono text-[15px] font-extrabold', d.sent ? TONE[dayTone(d.sent)] : 'text-faint')}>{d.sent}</div>
              </div>
            ))}
          </div>
          <div className={cn('mt-2 text-[12px]', r.days.over100 ? 'text-bad' : 'text-dim')}>
            {r.days.over100 ? `${r.days.over100} day${r.days.over100 === 1 ? '' : 's'} went over 100 — on the Free plan the rest of those emails fail.` : 'No day has gone over 100 so far.'}
            {r.queued > 0 && ` ${r.queued} drip email${r.queued === 1 ? '' : 's'} still queued.`}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3 text-[12.5px] text-dim">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Answers</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>Replies from leads</span><b className="mono text-right text-ink">{r.replies}</b>
            <span>Positive / interested</span><b className="mono text-right text-ok">{r.positive}</b>
            <span>Not interested</span><b className="mono text-right text-ink">{r.notInterested}</b>
            <span>Unsubscribe requests</span><b className="mono text-right text-ink">{r.unsubscribed}</b>
            <span>Out-of-office / auto replies</span><b className="mono text-right text-ink">{r.autoReplies}</b>
            <span>Bounce notices in the Inbox</span><b className={cn('mono text-right', r.bounceNotices ? 'text-warn' : 'text-ink')}>{r.bounceNotices}</b>
            <span>Leads Klientic won’t email (bounced / spam)</span><b className="mono text-right text-ink">{r.blockedLeads}</b>
            <span>Send errors (never left)</span><b className="mono text-right text-ink">{r.sendErrors}</b>
          </div>
        </div>
      </div>

      {/* Resend's own record */}
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-faint">Resend check · last 30 days (Resend keeps 30 days)</div>
            <div className="text-[12px] text-dim">The exact status of every email, straight from Resend — this also finds bounces Klientic never heard about.</div>
          </div>
          <button onClick={checkResend} disabled={rsBusy} className="btn btn-accent btn-sm">
            {rsBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} {rsBusy ? `Checking… ${rs?.total || 0}` : rs ? 'Check again' : 'Check with Resend'}
          </button>
        </div>

        {rs && rr && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Went out" value={rr.out.toLocaleString()} sub={rs.oldest ? `since ${new Date(rs.oldest).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : undefined} />
              <Tile label="Delivered" value={pct(rr.deliveredPct)} tone={rr.deliveredPct >= 95 ? 'ok' : rr.deliveredPct >= 90 ? 'warn' : 'bad'} sub={`${rr.delivered.toLocaleString()} emails`} />
              <Tile label="Bounce rate" value={pct(rr.bouncePct)} tone={bounceTone(rr.bouncePct)} sub={`${rs.events.bounced || 0} bounced · limit 4%`} />
              <Tile label="Spam complaints" value={pct(rr.complaintPct)} tone={complaintTone(rr.complaintPct)} sub={`${rs.events.complained || 0} · limit 0.08%`} />
              <Tile label="Delayed / failed" value={rr.delayed + rr.failed} sub={`${rr.delayed} delayed · ${rr.failed} failed`} />
              <Tile label="Opened" value={rr.opened ? pct(share(rr.opened, rr.out)) : '—'} sub={rr.opened ? `${rr.opened} opened` : 'open tracking is off'} />
            </div>
            {rsDone && rs.unrecorded.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-[12.5px]" style={{ borderColor: 'var(--amber)', background: 'var(--amber-soft)' }}>
                <div className="flex items-start gap-2 text-ink"><ShieldAlert size={15} className="mt-0.5 flex-none text-warn" />
                  <span><b>{rs.unrecorded.length} address{rs.unrecorded.length === 1 ? '' : 'es'}</b> bounced or marked you as spam, but Klientic didn’t know: {rs.unrecorded.slice(0, 4).map((u) => u.to).join(', ')}{rs.unrecorded.length > 4 ? ` +${rs.unrecorded.length - 4} more` : ''}.</span></div>
                <button onClick={applyMissing} disabled={applying} className="btn btn-sm btn-accent">{applying ? <Loader2 size={13} className="animate-spin" /> : null} Stop emailing them</button>
              </div>
            )}
            {senders.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead><tr>{['Sender (Resend)', 'Went out', 'Delivered', 'Bounced', 'Spam'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                  <tbody>{senders.map(([from, ev]) => {
                    const t = { ...emptyTally(), total: Object.values(ev).reduce((s, n) => s + n, 0), events: ev };
                    const x = resendRates(t);
                    return (
                      <tr key={from} className="border-t border-line">
                        <td className="td"><span className="flex items-center gap-1.5 text-ink"><Mail size={12} className="text-faint" />{from}</span></td>
                        <td className="td mono">{x.out}</td>
                        <td className="td mono">{pct(x.deliveredPct)}</td>
                        <td className={cn('td mono', TONE[bounceTone(x.bouncePct)])}>{ev.bounced || 0} · {pct(x.bouncePct)}</td>
                        <td className={cn('td mono', TONE[complaintTone(x.complaintPct)])}>{ev.complained || 0}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* breakdowns */}
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr>{['Sender (lifetime)', 'Sent', 'Bounced', 'Spam', 'Replies'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{r.senders.map((s) => (
              <tr key={s.sender} className="border-t border-line">
                <td className="td text-ink">{s.sender}</td>
                <td className="td mono">{s.sent.toLocaleString()}</td>
                <td className={cn('td mono', TONE[bounceTone(share(s.bounced, s.sent))])}>{s.bounced}</td>
                <td className="td mono">{s.complained}</td>
                <td className="td mono">{s.replies}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr>{['Project', 'Sent', 'Leads emailed', 'Answered', 'Bounced'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{r.projects.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="td text-ink">{p.name}</td>
                <td className="td mono">{p.sent.toLocaleString()}</td>
                <td className="td mono">{p.leadsEmailed.toLocaleString()}</td>
                <td className="td mono">{p.leadsReplied} · {pct(share(p.leadsReplied, p.leadsEmailed))}</td>
                <td className="td mono">{p.bounced}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {r.months.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr>{['Month', 'Sent', 'Replies', 'Bounced'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{r.months.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <td className="td text-ink">{monthLabel(m.month)}</td>
                <td className="td mono">{m.sent.toLocaleString()}</td>
                <td className="td mono">{m.replies}</td>
                <td className="td mono">{m.bounced}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
