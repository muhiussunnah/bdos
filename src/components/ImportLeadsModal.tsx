'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, CheckCircle2, AlertTriangle, ShieldCheck, Wand2, MailX } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal } from '@/components/ui';
import { CsvPicker } from '@/components/CsvPicker';
import { autoMap, rowsToLeads, isEmail, isPhone, hasContact, LEAD_FIELDS, FIELD_LABELS, type LeadField } from '@/lib/csv';

type Result = {
  inserted: number; skipped: { row: number; reason: string }[];
  /** imported without their bad email */
  cleaned: { row: number; reason: string }[];
  fixed: { row: number; from: string; to: string }[];
  badEmails: number; unchecked: number; verified: boolean;
};
/** big lists go in chunks so the email check never runs into a time limit */
const CHUNK = 1000;

/**
 * Import a custom lead list (CSV / pasted spreadsheet) into the active project.
 * Columns are auto-mapped and can be corrected before importing.
 */
export function ImportLeadsModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { project } = useApp();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<(LeadField | null)[]>([]);
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  /** check every email before import (fake, typo, throw-away, dead domain) */
  const [verify, setVerify] = useState(true);

  function reset() { setRows(null); setName(null); setMapping([]); setResult(null); setTag(''); setHasHeader(true); }
  function close() { reset(); onClose(); }

  function onParsed(r: string[][], n: string) {
    const headerish = r[0]?.some((c) => /[a-z]/i.test(c)) && !r[0]?.some((c) => isEmail(c));
    setHasHeader(!!headerish);
    setMapping(headerish ? autoMap(r[0]) : autoMap(r[0].map((_, i) => `col${i + 1}`)));
    setRows(r); setName(n); setResult(null);
  }

  const leads = rows ? rowsToLeads(rows, mapping, hasHeader) : [];
  /** which rows to keep: a way to reach them (email or phone), email only, or everything with a name */
  const [keep, setKeep] = useState<'contact' | 'email' | 'all'>('contact');
  const withEmail = leads.filter((l) => isEmail(l.email)).length;
  const phoneOnly = leads.filter((l) => !isEmail(l.email) && isPhone(l.phone)).length;
  const toImport = leads.filter((l) => (keep === 'email' ? isEmail(l.email) : keep === 'contact' ? hasContact(l) : l.company_name || isEmail(l.email)));
  const usable = toImport.length;
  const cols = rows ? Math.max(...rows.map((r) => r.length)) : 0;
  const headers = rows ? (hasHeader ? rows[0] : Array.from({ length: cols }, (_, i) => `Column ${i + 1}`)) : [];
  const preview = rows ? (hasHeader ? rows.slice(1, 4) : rows.slice(0, 3)) : [];

  async function run() {
    if (!project || !leads.length) return;
    if (!usable) return toast.error(keep === 'email' ? 'No rows with a valid email — map the Email column or keep rows with a phone too' : keep === 'contact' ? 'No rows with an email or phone — map the Email or Phone column' : 'Map at least a Company or Email column');
    setBusy(true);
    const total: Result = { inserted: 0, skipped: [], cleaned: [], fixed: [], badEmails: 0, unchecked: 0, verified: verify };
    try {
      for (let at = 0; at < toImport.length; at += CHUNK) {
        setProgress({ done: at, total: toImport.length });
        const res = await fetch('/api/leads/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, leads: toImport.slice(at, at + CHUNK), tag: tag.trim() || undefined, verify, keep, offset: at }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!total.inserted) throw new Error(data.error);
          toast.error(`Stopped after ${total.inserted} leads: ${data.error}`);
          break;
        }
        total.inserted += data.inserted || 0;
        total.skipped.push(...(data.skipped || []));
        total.cleaned.push(...(data.cleaned || []));
        total.fixed.push(...(data.fixed || []));
        total.badEmails += data.checked?.badEmails || 0;
        total.unchecked += data.checked?.unchecked || 0;
      }
      setResult(total);
      toast.success(`${total.inserted} leads imported${total.badEmails ? ` · ${total.badEmails} bad emails removed` : ''}`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally { setBusy(false); setProgress(null); }
  }

  return (
    <Modal open={open} onClose={close} title="Import your own lead list" wide>
      {!rows ? (
        <>
          <p className="mb-4 text-[13px] text-dim">Upload a list you already have. Imported leads join the pipeline as <b>New</b>, so the agent can write outreach and run follow-ups for them just like AI-found leads, or you can email them manually from Outreach.</p>
          <CsvPicker onParsed={onParsed} />
          <p className="hint mt-3">Recognised columns: company, name, email, website, phone, role, industry, location, linkedin, notes. Anything else can be mapped by hand in the next step.</p>
        </>
      ) : result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><CheckCircle2 size={20} /></span>
            <div>
              <div className="text-[15px] font-extrabold text-ink">{result.inserted} leads imported</div>
              <div className="text-[12.5px] text-dim">{result.skipped.length ? `${result.skipped.length} rows skipped` : 'Every row made it in'}</div>
            </div>
          </div>
          {result.verified && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat icon={<MailX size={15} />} color="var(--red)" n={result.badEmails} label="bad emails removed" hint="fake, mistyped, throw-away or the domain takes no mail" />
              <Stat icon={<Wand2 size={15} />} color="var(--accent)" n={result.fixed.length} label="typos fixed" hint="e.g. gmial.com → gmail.com" />
              <Stat icon={<ShieldCheck size={15} />} color="var(--green)" n={Math.max(0, result.inserted - result.cleaned.length)} label="leads with a checked email or phone" hint={result.unchecked ? `${result.unchecked} domains could not be checked in time and were kept` : 'every domain answered'} />
            </div>
          )}
          {(result.fixed.length > 0 || result.cleaned.length > 0) && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-surface p-3 text-[12px]">
              {result.fixed.slice(0, 100).map((f) => (
                <div key={`f${f.row}`} className="flex gap-2 py-0.5 text-dim"><Wand2 size={13} className="mt-0.5 flex-none text-accent" /> Row {f.row}: {f.from} → <b className="text-ink">{f.to}</b></div>
              ))}
              {result.cleaned.slice(0, 100).map((c) => (
                <div key={`c${c.row}`} className="flex gap-2 py-0.5 text-dim"><MailX size={13} className="mt-0.5 flex-none text-bad" /> Row {c.row}: {c.reason}</div>
              ))}
            </div>
          )}
          {result.skipped.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3 text-[12px]">
              {result.skipped.slice(0, 100).map((s) => (
                <div key={s.row} className="flex gap-2 py-0.5 text-dim"><AlertTriangle size={13} className="mt-0.5 flex-none text-warn" /> Row {s.row}: {s.reason}</div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="btn btn-ghost">Import another list</button>
            <button onClick={close} className="btn btn-primary">Done</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <CsvPicker onParsed={onParsed} onClear={reset} fileName={name} />

          <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
            <label className="flex items-center gap-2 font-semibold text-ink">
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> First row is a header
            </label>
            <span className="text-faint">·</span>
            <span className="text-dim"><b className="text-ink">{leads.length}</b> rows · <b className="text-ink">{withEmail}</b> with email · <b className="text-ink">{phoneOnly}</b> phone only</span>
            <span className="text-faint">·</span>
            <label className="flex items-center gap-2 font-semibold text-ink" title="Phone-only leads are for calling; the agent can only email leads that have an email">
              Import
              <select className="input !w-auto !py-1 !text-[12.5px]" value={keep} onChange={(e) => setKeep(e.target.value as typeof keep)}>
                <option value="contact">rows with email or phone</option>
                <option value="email">only rows with email</option>
                <option value="all">every row with a company</option>
              </select>
              <span className="font-normal text-faint">→ {usable}</span>
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-surface-2">
                  {headers.map((h, i) => (
                    <th key={i} className="min-w-[150px] px-3 py-2 text-left align-top">
                      <div className="mb-1.5 truncate text-[11px] font-bold uppercase tracking-wide text-faint" title={h}>{h || `Column ${i + 1}`}</div>
                      <select className="input !py-1.5 !text-[12px]" value={mapping[i] ?? ''}
                        onChange={(e) => setMapping((m) => { const n = [...m]; n[i] = (e.target.value || null) as LeadField | null; return n; })}>
                        <option value="">— skip —</option>
                        {LEAD_FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, ri) => (
                  <tr key={ri} className="border-t border-line">
                    {headers.map((_, ci) => <td key={ci} className="max-w-[220px] truncate px-3 py-2 text-dim" title={r[ci]}>{r[ci] || <span className="text-faint">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px]">
            <input type="checkbox" className="mt-0.5" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
            <span>
              <b className="inline-flex items-center gap-1 text-ink"><ShieldCheck size={13} style={{ color: 'var(--green)' }} /> Check emails before import (recommended)</b>
              <span className="block text-dim">Removes fake and placeholder addresses, throw-away mailboxes and domains that cannot receive email, and fixes typos like gmial.com. A row with a bad email is kept without it when it has a phone{keep === 'all' ? ' or a company' : ''}. Fewer bounces = your emails keep reaching the inbox.</span>
            </span>
          </label>

          <div className="field !mb-0"><label>Tag these leads (optional)</label>
            <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. expo-2026, old-clients" /></div>

          {!usable && <p className="text-[12.5px] font-semibold text-warn">Map a Company or Email column to continue.</p>}

          <div className="flex justify-end gap-2">
            <button onClick={close} className="btn btn-ghost">Cancel</button>
            <button onClick={run} disabled={busy || !usable} className="btn btn-accent">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {busy && progress ? `${verify ? 'Checking & importing' : 'Importing'} ${Math.min(progress.done + CHUNK, progress.total)} / ${progress.total}…` : `Import ${usable} lead${usable === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ icon, color, n, label, hint }: { icon: React.ReactNode; color: string; n: number; label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5" title={hint}>
      <div className="flex items-center gap-2"><span style={{ color }}>{icon}</span><b className="text-[16px] text-ink">{n}</b></div>
      <div className="mt-0.5 text-[11.5px] text-dim">{label}</div>
    </div>
  );
}
