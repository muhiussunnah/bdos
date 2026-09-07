'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Upload, Users, Search, CheckCircle2, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal, StageTag } from '@/components/ui';
import { CsvPicker } from '@/components/CsvPicker';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { RichEditor, isHtmlEmpty, type RichEditorHandle } from '@/components/RichEditor';
import { autoMap, rowsToLeads, isEmail, renderTemplate, recipientVars } from '@/lib/csv';
import type { Lead } from '@/lib/types';

type Recipient = { email: string; name?: string | null; company?: string | null; role?: string | null; website?: string | null; leadId?: string | null };
type Step = 'recipients' | 'message' | 'sending';
type Source = 'csv' | 'leads';
type SendResult = { email: string; ok: boolean; error?: string };

const PLACEHOLDERS = ['{{first_name}}', '{{name}}', '{{company}}', '{{email}}', '{{role}}'];
const CHUNK = 20;

const LEAD_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'import', label: 'Imported' },
  { key: 'active', label: 'In sequence' },
  { key: 'positive', label: 'Positive' },
];

/**
 * Manual bulk sender: pick recipients from a CSV or from existing leads,
 * write one message with {{placeholders}}, attach files, send in chunks.
 */
export function BulkSendModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const { project, supabase } = useApp();
  const [step, setStep] = useState<Step>('recipients');
  const [source, setSource] = useState<Source>('csv');

  // csv source
  const [rows, setRows] = useState<string[][] | null>(null);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [alsoImport, setAlsoImport] = useState(true);

  // leads source
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadFilter, setLeadFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // message
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [startFollowups, setStartFollowups] = useState(true);
  const bodyRef = useRef<RichEditorHandle>(null);

  // sending
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<SendResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('recipients'); setSource('csv'); setRows(null); setCsvName(null); setAlsoImport(true);
    setSelected(new Set()); setQ(''); setLeadFilter('all'); setSubject(''); setBody(''); setFiles([]);
    setStartFollowups(true); setProgress({ done: 0, total: 0 }); setResults([]); setBusy(false);
    if (project) {
      supabase.from('leads').select('*').eq('project_id', project.id).not('email', 'is', null).order('created_at', { ascending: false })
        .then(({ data }) => setLeads((data as Lead[]) || []));
    }
  }, [open, project, supabase]);

  // ---- recipients from CSV
  const csvRecipients = useMemo<Recipient[]>(() => {
    if (!rows?.length) return [];
    const headerish = rows[0].some((c) => /[a-z]/i.test(c)) && !rows[0].some((c) => isEmail(c));
    const mapping = headerish ? autoMap(rows[0]) : autoMap(rows[0].map((_, i) => `col${i + 1}`));
    let parsed = rowsToLeads(rows, mapping, headerish);
    // no email column recognised → scan every cell for an address
    if (!parsed.some((p) => isEmail(p.email))) {
      const body = headerish ? rows.slice(1) : rows;
      parsed = body.map((r) => {
        const email = r.find((c) => isEmail(c)) || '';
        const rest = r.filter((c) => c !== email);
        return { email, contact_name: rest[0] || '', company_name: rest[1] || '' };
      });
    }
    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const p of parsed) {
      const email = (p.email || '').trim().toLowerCase();
      if (!isEmail(email) || seen.has(email)) continue;
      seen.add(email);
      out.push({ email, name: p.contact_name || null, company: p.company_name || null, role: p.role || null, website: p.website || null });
    }
    return out;
  }, [rows]);

  // ---- recipients from leads
  const filteredLeads = leads.filter((l) => {
    if (q && !`${l.company_name} ${l.contact_name} ${l.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (leadFilter === 'new') return l.stage === 'new';
    if (leadFilter === 'import') return l.source === 'import';
    if (leadFilter === 'active') return ['contacted', 'followup1', 'followup2', 'followup3'].includes(l.stage);
    if (leadFilter === 'positive') return ['positive', 'meeting', 'closed'].includes(l.stage);
    return true;
  });
  const leadRecipients = useMemo<Recipient[]>(() =>
    leads.filter((l) => selected.has(l.id) && l.email).map((l) => ({
      email: l.email!.toLowerCase(), name: l.contact_name, company: l.company_name, role: l.role, website: l.website, leadId: l.id,
    })), [leads, selected]);

  const recipients = source === 'csv' ? csvRecipients : leadRecipients;
  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selected.has(l.id));
  function toggleAll() {
    setSelected((s) => { const n = new Set(s); if (allFilteredSelected) filteredLeads.forEach((l) => n.delete(l.id)); else filteredLeads.forEach((l) => n.add(l.id)); return n; });
  }

  function insertPlaceholder(p: string) {
    if (bodyRef.current) bodyRef.current.insertText(p);
    else setBody((b) => b + p);
  }

  const previewVars = recipients[0] ? recipientVars(recipients[0]) : { first_name: 'Anna', name: 'Anna Svensson', company: 'Acme AB', email: 'anna@acme.se', role: '', website: '', domain: 'acme.se' };

  // ---- send
  async function send() {
    if (!project) return;
    if (!recipients.length) return toast.error('No recipients');
    if (!subject.trim()) return toast.error('Add a subject');
    if (isHtmlEmpty(body)) return toast.error('Write a message');
    setBusy(true); setStep('sending');
    let list = recipients;
    try {
      // CSV → optionally import first so sends link to real leads
      if (source === 'csv' && alsoImport) {
        const res = await fetch('/api/leads/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, leads: list.map((r) => ({ email: r.email, contact_name: r.name, company_name: r.company, role: r.role, website: r.website })) }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Import failed, sending without linking to leads'); }
        const emails = list.map((r) => r.email);
        const found: { id: string; email: string }[] = [];
        for (let i = 0; i < emails.length; i += 200) {
          const { data } = await supabase.from('leads').select('id,email').eq('project_id', project.id).in('email', emails.slice(i, i + 200));
          found.push(...((data as { id: string; email: string }[]) || []));
        }
        const byEmail = new Map(found.map((f) => [f.email.toLowerCase(), f.id]));
        list = list.map((r) => ({ ...r, leadId: byEmail.get(r.email) || null }));
      }

      const batchId = `bulk_${Date.now().toString(36)}`;
      setProgress({ done: 0, total: list.length });
      const all: SendResult[] = [];
      for (let i = 0; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK);
        const fd = new FormData();
        fd.set('payload', JSON.stringify({ projectId: project.id, subject: subject.trim(), html: body, recipients: chunk, startFollowups, batchId }));
        files.forEach((f) => fd.append('files', f));
        const res = await fetch('/api/outreach/bulk', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          chunk.forEach((r) => all.push({ email: r.email, ok: false, error: data.error || `HTTP ${res.status}` }));
          if (res.status === 428) { setResults([...all]); throw new Error(data.error); }
        } else all.push(...(data.results as SendResult[]));
        setResults([...all]); setProgress({ done: Math.min(i + CHUNK, list.length), total: list.length });
      }
      const okCount = all.filter((r) => r.ok).length;
      toast.success(`${okCount} of ${list.length} emails sent`);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk send failed');
    } finally { setBusy(false); }
  }

  const sentOk = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Send to a list" wide>
      {/* stepper */}
      <div className="mb-4 flex items-center gap-2 text-[12px] font-bold">
        {(['recipients', 'message', 'sending'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${step === s ? 'bg-ink text-bg' : 'bg-surface-2 text-dim'}`}>{i + 1}</span>
            <span className={step === s ? 'text-ink' : 'text-faint'}>{s === 'recipients' ? 'Recipients' : s === 'message' ? 'Message' : 'Send'}</span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-line" />}
          </div>
        ))}
        {recipients.length > 0 && <span className="ml-auto rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-accent">{recipients.length} recipient{recipients.length === 1 ? '' : 's'}</span>}
      </div>

      {step === 'recipients' && (
        <div className="space-y-4">
          <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
            {([['csv', 'Upload a list', Upload], ['leads', 'Pick from my leads', Users]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setSource(k)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${source === k ? 'bg-ink text-bg' : 'text-dim'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {source === 'csv' ? (
            <>
              <CsvPicker fileName={csvName} onClear={() => { setRows(null); setCsvName(null); }} onParsed={(r, n) => { setRows(r); setCsvName(n); }} />
              {rows && (
                <>
                  <div className="text-[12.5px] text-dim"><b className="text-ink">{csvRecipients.length}</b> unique valid email{csvRecipients.length === 1 ? '' : 's'} found{csvRecipients.length === 0 && ' — make sure the list has an email column'}</div>
                  {csvRecipients.length > 0 && (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-line text-[12.5px]">
                      {csvRecipients.slice(0, 50).map((r) => (
                        <div key={r.email} className="flex items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{r.name || r.company || r.email.split('@')[0]}</span>
                          <span className="truncate text-dim">{r.company && r.name ? `${r.company} · ` : ''}{r.email}</span>
                        </div>
                      ))}
                      {csvRecipients.length > 50 && <div className="px-3 py-2 text-faint">…and {csvRecipients.length - 50} more</div>}
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-[12.5px] text-dim">
                    <input type="checkbox" checked={alsoImport} onChange={(e) => setAlsoImport(e.target.checked)} />
                    Also add these people to my Leads (recommended, so replies and follow-ups are tracked)
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
                  {LEAD_FILTERS.map((f) => (
                    <button key={f.key} onClick={() => setLeadFilter(f.key)} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold transition ${leadFilter === f.key ? 'bg-ink text-bg' : 'text-dim'}`}>{f.label}</button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-1.5">
                  <Search size={13} className="text-faint" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-32 bg-transparent text-[12.5px] outline-none text-ink" />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-line text-[12.5px]">
                <label className="flex items-center gap-3 border-b border-line bg-surface-2 px-3 py-2 font-bold text-ink">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} /> Select all {filteredLeads.length} shown
                </label>
                {filteredLeads.length === 0 && <div className="px-3 py-6 text-center text-faint">No leads with an email match this filter.</div>}
                {filteredLeads.map((l) => (
                  <label key={l.id} className="flex cursor-pointer items-center gap-3 border-t border-line px-3 py-2 first:border-t-0 hover:bg-surface-2">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{l.company_name}{l.contact_name ? ` · ${l.contact_name}` : ''}</span>
                      <span className="block truncate text-[11.5px] text-faint">{l.email}</span>
                    </span>
                    <StageTag stage={l.stage} />
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button onClick={() => setStep('message')} disabled={!recipients.length} className="btn btn-accent">Write the message <ArrowRight size={15} /></button>
          </div>
        </div>
      )}

      {step === 'message' && (
        <div className="space-y-3">
          <div className="field !mb-0"><label>Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Quick question for {{company}}" /></div>
          <div className="field !mb-0">
            <div className="flex flex-wrap items-center justify-between gap-2"><label>Message</label>
              <div className="flex flex-wrap gap-1">
                {PLACEHOLDERS.map((p) => <button key={p} type="button" onClick={() => insertPlaceholder(p)} className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-dim hover:border-accent hover:text-accent">{p}</button>)}
              </div>
            </div>
            <RichEditor ref={bodyRef} value={body} onChange={setBody} minHeight={220} placeholder="Hi {{first_name|there}}, I noticed {{company}} …" />
            <p className="hint">Placeholders are filled per recipient. Use {'{{first_name|there}}'} to set a fallback when a value is missing.</p>
          </div>

          <AttachmentPicker files={files} onChange={setFiles} compact />

          {(subject || body) && (
            <div className="rounded-xl border border-line bg-surface-2 p-3.5">
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-faint">Preview · {recipients[0]?.email || 'example'}</div>
              <div className="text-[13px] font-bold text-ink">{renderTemplate(subject, previewVars) || '(no subject)'}</div>
              <div className="rte-preview mt-1 text-dim" dangerouslySetInnerHTML={{ __html: renderTemplate(body, previewVars) }} />
            </div>
          )}

          <label className="flex items-center gap-2 text-[12.5px] text-dim">
            <input type="checkbox" checked={startFollowups} onChange={(e) => setStartFollowups(e.target.checked)} />
            Let the agent run automated follow-ups for leads that are still <b className="text-ink">New</b>
          </label>

          <div className="flex justify-between gap-2 pt-1">
            <button onClick={() => setStep('recipients')} className="btn btn-ghost"><ArrowLeft size={15} /> Recipients</button>
            <button onClick={send} disabled={busy} className="btn btn-accent"><Send size={15} /> Send to {recipients.length}</button>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{busy ? 'Sending…' : 'Finished'}</span><span className="text-dim">{progress.done} / {progress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-surface p-3.5"><div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dim"><CheckCircle2 size={13} className="text-ok" /> Sent</div><div className="mt-1 text-[22px] font-extrabold text-ink">{sentOk}</div></div>
            <div className="rounded-xl border border-line bg-surface p-3.5"><div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dim"><XCircle size={13} className="text-bad" /> Failed</div><div className="mt-1 text-[22px] font-extrabold text-ink">{failed.length}</div></div>
          </div>
          {failed.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3 text-[12px]">
              {failed.map((f, i) => <div key={i} className="py-0.5 text-dim"><b className="text-ink">{f.email}</b> — {f.error}</div>)}
            </div>
          )}
          {busy ? <div className="flex items-center gap-2 text-[12.5px] text-dim"><Loader2 size={14} className="animate-spin text-accent" /> Keep this window open until sending completes.</div> : (
            <div className="flex justify-end"><button onClick={onClose} className="btn btn-primary">Done</button></div>
          )}
        </div>
      )}
    </Modal>
  );
}
