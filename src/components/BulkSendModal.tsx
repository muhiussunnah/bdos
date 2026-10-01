'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Send, Loader2, Upload, Users, Search, CheckCircle2, XCircle, ArrowLeft, ArrowRight, History, MailCheck } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal, StageTag } from '@/components/ui';
import { CsvPicker } from '@/components/CsvPicker';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { RichEditor, isHtmlEmpty, type RichEditorHandle } from '@/components/RichEditor';
import { SubjectInput, rememberSubject } from '@/components/SubjectInput';
import { SentHistoryDialog, type HistoryTarget } from '@/components/SentHistoryDialog';
import { autoMap, rowsToLeads, isEmail, renderTemplate, recipientVars } from '@/lib/csv';
import { sendersFrom } from '@/lib/email/resend';
import { EMPTY_HISTORY, historyFor, loadSentHistory, repairContactedLeads, type SentHistory } from '@/lib/sentHistory';
import { relTime } from '@/lib/utils';
import type { Lead } from '@/lib/types';

type Recipient = { email: string; name?: string | null; company?: string | null; role?: string | null; website?: string | null; leadId?: string | null };
type Step = 'recipients' | 'message' | 'sending';
type Source = 'csv' | 'leads';
type SendResult = { email: string; ok: boolean; error?: string };
/** The "already emailed" dialog: who it is about and what to do once the user confirms. */
type Prompt = { targets: HistoryTarget[]; onConfirm: () => void; view?: boolean };

const PLACEHOLDERS = ['{{first_name}}', '{{name}}', '{{company}}', '{{email}}', '{{role}}'];
const CHUNK = 20;
const PAGE = 1000;

const LEAD_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'import', label: 'Imported' },
  { key: 'active', label: 'In sequence' },
  { key: 'positive', label: 'Positive' },
];

const lower = (s?: string | null) => (s || '').trim().toLowerCase();

/** Every lead with an email in the project (paged past Supabase's 1000-row cap). */
async function fetchLeads(supabase: SupabaseClient, projectId: string): Promise<Lead[]> {
  const out: Lead[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase.from('leads').select('*').eq('project_id', projectId).not('email', 'is', null)
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    const rows = (data as Lead[] | null) || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/**
 * Manual bulk sender: pick recipients from a CSV or from existing leads,
 * write one message with {{placeholders}}, attach files, send in chunks.
 * Anyone who was already emailed from this project triggers a warning with
 * the history of what went out before they can be picked again.
 */
export function BulkSendModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const { project, supabase, settings } = useApp();
  const senders = sendersFrom(settings);
  const [fromId, setFromId] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [step, setStep] = useState<Step>('recipients');
  const [source, setSource] = useState<Source>('csv');

  // csv source
  const [rows, setRows] = useState<string[][] | null>(null);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [alsoImport, setAlsoImport] = useState(true);

  // leads source
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<SentHistory>(EMPTY_HISTORY);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadFilter, setLeadFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** addresses the user explicitly confirmed to email again (this session of the modal) */
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState<Prompt | null>(null);

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

  const loadLeads = useCallback(async () => {
    if (!project) return;
    setLoadingLeads(true);
    try {
      const [list, hist] = await Promise.all([fetchLeads(supabase, project.id), loadSentHistory(supabase, project.id)]);
      // Leads that were emailed earlier but never left "New" are moved to
      // Contacted so the New list only holds people nobody has written to.
      const repaired = await repairContactedLeads(supabase, list, hist);
      setLeads(repaired.size ? list.map((l) => repaired.get(l.id) || l) : list);
      setHistory(hist);
    } finally { setLoadingLeads(false); }
  }, [project, supabase]);

  useEffect(() => {
    if (!open) return;
    setStep('recipients'); setSource('csv'); setRows(null); setCsvName(null); setAlsoImport(true);
    setSelected(new Set()); setQ(''); setLeadFilter('all'); setSubject(''); setBody(''); setFiles([]);
    setStartFollowups(true); setProgress({ done: 0, total: 0 }); setResults([]); setBusy(false);
    setFromId(sendersFrom(settings).find((s) => s.isDefault)?.id || sendersFrom(settings)[0]?.id || '');
    setCc(''); setBcc(''); setShowCc(false);
    setConfirmed(new Set()); setPrompt(null);
    loadLeads();
  }, [open, settings, loadLeads]);

  // ---- who was already emailed
  const histOf = useCallback((who: { id?: string | null; email?: string | null }) => historyFor(history, who), [history]);
  const isContacted = useCallback((l: Lead) => !!l.last_contacted_at || histOf(l).length > 0, [histOf]);
  const matches = useCallback((l: Lead, key: string) => {
    if (key === 'new') return l.stage === 'new' && !isContacted(l);
    if (key === 'contacted') return isContacted(l);
    if (key === 'import') return l.source === 'import';
    if (key === 'active') return ['contacted', 'followup1', 'followup2', 'followup3'].includes(l.stage);
    if (key === 'positive') return ['positive', 'meeting', 'closed'].includes(l.stage);
    return true;
  }, [isContacted]);
  const targetOf = useCallback((l: Lead): HistoryTarget => ({
    email: lower(l.email), label: `${l.company_name}${l.contact_name ? ` · ${l.contact_name}` : ''}`,
    leadId: l.id, lastContactedAt: l.last_contacted_at, rows: histOf(l),
  }), [histOf]);
  const markConfirmed = (emails: string[]) => setConfirmed((c) => { const n = new Set(c); emails.forEach((e) => n.add(e)); return n; });
  const selectIds = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });

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
  const csvAlreadyEmailed = useMemo(() => csvRecipients.filter((r) => histOf({ email: r.email }).length > 0).length, [csvRecipients, histOf]);

  // ---- recipients from leads
  const filteredLeads = useMemo(() => leads.filter((l) => {
    if (q && !`${l.company_name} ${l.contact_name} ${l.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return matches(l, leadFilter);
  }), [leads, q, leadFilter, matches]);
  const tabCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of LEAD_FILTERS) c[f.key] = leads.filter((l) => matches(l, f.key)).length;
    return c;
  }, [leads, matches]);
  const leadRecipients = useMemo<Recipient[]>(() =>
    leads.filter((l) => selected.has(l.id) && l.email).map((l) => ({
      email: lower(l.email), name: l.contact_name, company: l.company_name, role: l.role, website: l.website, leadId: l.id,
    })), [leads, selected]);

  const recipients = source === 'csv' ? csvRecipients : leadRecipients;
  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selected.has(l.id));

  function toggleLead(l: Lead) {
    if (selected.has(l.id)) { selectIds([l.id], false); return; }
    const email = lower(l.email);
    if (isContacted(l) && !confirmed.has(email)) {
      setPrompt({ targets: [targetOf(l)], onConfirm: () => { markConfirmed([email]); selectIds([l.id], true); } });
      return;
    }
    selectIds([l.id], true);
  }
  function toggleAll() {
    const ids = filteredLeads.map((l) => l.id);
    if (allFilteredSelected) { selectIds(ids, false); return; }
    const dups = filteredLeads.filter((l) => isContacted(l) && !confirmed.has(lower(l.email)));
    if (!dups.length) { selectIds(ids, true); return; }
    setPrompt({ targets: dups.map(targetOf), onConfirm: () => { markConfirmed(dups.map((l) => lower(l.email))); selectIds(ids, true); } });
  }
  function showHistory(l: Lead) {
    setPrompt({ view: true, targets: [targetOf(l)], onConfirm: () => { markConfirmed([lower(l.email)]); selectIds([l.id], true); } });
  }

  function insertPlaceholder(p: string) {
    if (bodyRef.current) bodyRef.current.insertText(p);
    else setBody((b) => b + p);
  }

  const previewVars = recipients[0] ? recipientVars(recipients[0]) : { first_name: 'Anna', name: 'Anna Svensson', company: 'Acme AB', email: 'anna@acme.se', role: '', website: '', domain: 'acme.se' };

  // ---- send
  function send() {
    if (!project) return;
    if (!recipients.length) return toast.error('No recipients');
    if (!subject.trim()) return toast.error('Add a subject');
    if (isHtmlEmpty(body)) return toast.error('Write a message');
    // last guard before anything goes out: anyone already emailed (CSV rows included)
    const leadsById = new Map(leads.map((l) => [l.id, l]));
    const dups = recipients.filter((r) => {
      if (confirmed.has(r.email)) return false;
      const lead = r.leadId ? leadsById.get(r.leadId) : undefined;
      return !!lead?.last_contacted_at || histOf({ id: r.leadId, email: r.email }).length > 0;
    });
    if (dups.length) {
      setPrompt({
        targets: dups.map((r) => ({
          email: r.email, label: r.name || r.company || r.email, leadId: r.leadId,
          lastContactedAt: (r.leadId && leadsById.get(r.leadId)?.last_contacted_at) || null,
          rows: histOf({ id: r.leadId, email: r.email }),
        })),
        onConfirm: () => { markConfirmed(dups.map((r) => r.email)); void doSend(); },
      });
      return;
    }
    void doSend();
  }

  async function doSend() {
    if (!project) return;
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
        fd.set('payload', JSON.stringify({ projectId: project.id, subject: subject.trim(), html: body, recipients: chunk, startFollowups, batchId, fromId: fromId || null, cc, bcc }));
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
      if (okCount) rememberSubject(subject);
      toast.success(`${okCount} of ${list.length} emails sent`);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk send failed');
    } finally { setBusy(false); }
  }

  const sentOk = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return (
    <>
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
                  {csvAlreadyEmailed > 0 && (
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--amber)' }}>
                      <MailCheck size={13} /> {csvAlreadyEmailed} of these {csvAlreadyEmailed === 1 ? 'was' : 'were'} already emailed from this project — you&rsquo;ll be asked to confirm before sending.
                    </div>
                  )}
                  {csvRecipients.length > 0 && (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-line text-[12.5px]">
                      {csvRecipients.slice(0, 50).map((r) => (
                        <div key={r.email} className="flex items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{r.name || r.company || r.email.split('@')[0]}</span>
                          <span className="truncate text-dim">{r.company && r.name ? `${r.company} · ` : ''}{r.email}</span>
                          {histOf({ email: r.email }).length > 0 && <span className="flex-none text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--amber)' }}>Emailed</span>}
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
                <div className="inline-flex flex-wrap rounded-[11px] border border-line bg-surface-2 p-[3px]">
                  {LEAD_FILTERS.map((f) => (
                    <button key={f.key} onClick={() => setLeadFilter(f.key)} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold transition ${leadFilter === f.key ? 'bg-ink text-bg' : 'text-dim'}`}>
                      {f.label} <span className={leadFilter === f.key ? 'opacity-70' : 'text-faint'}>{tabCounts[f.key] ?? 0}</span>
                    </button>
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
                  {loadingLeads && <span className="ml-auto flex items-center gap-1.5 text-[11.5px] font-semibold text-dim"><Loader2 size={13} className="animate-spin text-accent" /> Refreshing…</span>}
                </label>
                {filteredLeads.length === 0 && (
                  <div className="px-3 py-6 text-center text-faint">
                    {leadFilter === 'contacted' ? 'Nobody has been emailed from this project yet.' : 'No leads with an email match this filter.'}
                  </div>
                )}
                {filteredLeads.map((l) => {
                  const sent = histOf(l);
                  const contacted = isContacted(l);
                  const last = sent[0];
                  return (
                    <div key={l.id} className={`flex items-center gap-3 border-t border-line px-3 py-2 first:border-t-0 hover:bg-surface-2 ${selected.has(l.id) ? 'bg-[var(--accent-soft)]' : ''}`}>
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleLead(l)} aria-label={`Select ${l.company_name}`} />
                      <button type="button" onClick={() => toggleLead(l)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate font-semibold text-ink">{l.company_name}{l.contact_name ? ` · ${l.contact_name}` : ''}</span>
                        <span className="block truncate text-[11.5px] text-faint">{l.email}</span>
                        {contacted && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--amber)' }}>
                            <MailCheck size={11} className="flex-none" />
                            <span className="truncate">
                              {sent.length ? `${sent.length} email${sent.length === 1 ? '' : 's'} sent` : 'Contacted'} · last {relTime(last?.sent_at || last?.created_at || l.last_contacted_at)}{last?.subject ? ` · ${last.subject}` : ''}
                            </span>
                          </span>
                        )}
                      </button>
                      {contacted && (
                        <button type="button" onClick={() => showHistory(l)} className="btn btn-ghost btn-sm flex-none !px-2" title="See what was sent before">
                          <History size={13} /> History
                        </button>
                      )}
                      <StageTag stage={l.stage} />
                    </div>
                  );
                })}
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
          <div className="field !mb-0">
            <div className="flex items-center justify-between"><label>Send from</label>
              {!showCc && <button type="button" onClick={() => setShowCc(true)} className="text-[12px] font-bold text-accent hover:underline">Cc / Bcc</button>}
            </div>
            {senders.length ? (
              <select className="input" value={fromId} onChange={(e) => setFromId(e.target.value)} aria-label="Send from">
                {senders.map((s) => <option key={s.id} value={s.id}>{s.name} &lt;{s.email}&gt;{s.isDefault ? ' · default' : ''}</option>)}
              </select>
            ) : <div className="input !bg-surface-2 text-[12.5px] text-dim">Klientic sandbox sender — add your own in Settings → Email</div>}
          </div>
          {showCc && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field !mb-0"><label>Cc <span className="text-faint">(every email)</span></label><input className="input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma separated" /></div>
              <div className="field !mb-0"><label>Bcc <span className="text-faint">(every email)</span></label><input className="input" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="comma separated" /></div>
            </div>
          )}
          <div className="field !mb-0"><label>Subject</label>
            <SubjectInput value={subject} onChange={setSubject} placeholder="Quick question for {{company}}" /></div>
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

          <div>
            <label className="flex items-center gap-2 text-[12.5px] text-dim">
              <input type="checkbox" checked={startFollowups} onChange={(e) => setStartFollowups(e.target.checked)} />
              Let the agent run automated follow-ups for leads that are still <b className="text-ink">New</b>
            </label>
            <p className="hint">Every lead you send to moves from New to Contacted either way — this only decides whether the agent follows up later.</p>
          </div>

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

    {/* rendered outside the (transformed) modal so it stacks on top of it */}
    <SentHistoryDialog
      open={!!prompt}
      view={prompt?.view}
      targets={prompt?.targets || []}
      onCancel={() => setPrompt(null)}
      onConfirm={() => { const p = prompt; setPrompt(null); p?.onConfirm(); }}
    />
    </>
  );
}
