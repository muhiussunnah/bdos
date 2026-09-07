'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Sparkles, X, Users } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal } from '@/components/ui';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { RichEditor, plainToHtml, isHtmlEmpty } from '@/components/RichEditor';
import { isEmail } from '@/lib/csv';
import type { Lead } from '@/lib/types';

type Picked = { id: string; email: string; company_name: string; contact_name: string | null; stage: string };

/**
 * Gmail-style manual composer. Type any address, or pick one of your leads
 * (search-as-you-type). Supports Cc/Bcc, attachments, optional "save as lead"
 * and optionally hands the lead over to the automated follow-up sequence.
 */
export function ComposeModal({ open, onClose, onSent, lead }: {
  open: boolean; onClose: () => void; onSent?: () => void; lead?: Lead | null;
}) {
  const { project, supabase, settings } = useApp();
  const [to, setTo] = useState('');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saveLead, setSaveLead] = useState(true);
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [startFollowups, setStartFollowups] = useState(true);
  const [busy, setBusy] = useState<'send' | 'ai' | null>(null);
  const [sugs, setSugs] = useState<Picked[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  // prefill from a lead when opened from the lead drawer
  useEffect(() => {
    if (!open) return;
    if (lead) {
      setPicked(lead.email ? { id: lead.id, email: lead.email, company_name: lead.company_name, contact_name: lead.contact_name, stage: lead.stage } : null);
      setTo(lead.email || '');
      setCompany(lead.company_name);
      setContactName(lead.contact_name || '');
    } else {
      setPicked(null); setTo(''); setCompany(''); setContactName('');
    }
    setCc(''); setBcc(''); setShowCc(false); setSubject(''); setBody(''); setFiles([]); setSaveLead(true); setStartFollowups(true);
    setTimeout(() => toRef.current?.focus(), 50);
  }, [open, lead]);

  // search leads while typing in "To"
  useEffect(() => {
    if (!open || !project || picked || to.trim().length < 2) { setSugs([]); return; }
    const q = to.trim();
    const h = setTimeout(async () => {
      const { data } = await supabase.from('leads')
        .select('id,email,company_name,contact_name,stage')
        .eq('project_id', project.id).not('email', 'is', null)
        .or(`email.ilike.%${q}%,company_name.ilike.%${q}%,contact_name.ilike.%${q}%`)
        .limit(6);
      setSugs((data as Picked[]) || []); setSugOpen(true);
    }, 180);
    return () => clearTimeout(h);
  }, [to, open, project, supabase, picked]);

  function pick(p: Picked) {
    setPicked(p); setTo(p.email); setCompany(p.company_name); setContactName(p.contact_name || ''); setSugOpen(false);
  }
  function unpick() { setPicked(null); setTo(''); setTimeout(() => toRef.current?.focus(), 30); }

  async function writeWithAI() {
    if (!picked) return toast.error('Pick one of your leads first so the agent has context');
    setBusy('ai');
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: picked.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubject(data.subject); setBody(plainToHtml(data.body));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not draft'); }
    finally { setBusy(null); }
  }

  async function send() {
    if (!project) return;
    const primary = to.split(/[,;]/)[0]?.trim();
    if (!primary || !isEmail(primary)) return toast.error('Enter a valid recipient email');
    if (!subject.trim()) return toast.error('Add a subject');
    if (isHtmlEmpty(body)) return toast.error('Write a message');
    setBusy('send');
    try {
      const fd = new FormData();
      fd.set('projectId', project.id);
      fd.set('to', to); fd.set('cc', cc); fd.set('bcc', bcc);
      fd.set('subject', subject.trim()); fd.set('html', body);
      if (picked) fd.set('leadId', picked.id);
      else if (saveLead) { fd.set('saveLead', '1'); fd.set('company', company.trim()); fd.set('contactName', contactName.trim()); }
      if (startFollowups && (picked || saveLead)) fd.set('startFollowups', '1');
      files.forEach((f) => fd.append('files', f));
      const res = await fetch('/api/outreach/compose', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Sent to ${primary}`);
      onSent?.(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Send failed'); }
    finally { setBusy(null); }
  }

  const fromLabel = settings?.from_email ? `${settings.from_name || 'Klientic'} <${settings.from_email}>` : 'Klientic sandbox sender (set yours in Settings → Email)';
  const isNewContact = !picked && isEmail(to.split(/[,;]/)[0]?.trim() || '');

  return (
    <Modal open={open} onClose={onClose} title="New email" wide>
      <div className="space-y-3">
        <div className="text-[12px] text-faint">From <span className="font-semibold text-dim">{fromLabel}</span></div>

        {/* To */}
        <div className="field !mb-0">
          <div className="flex items-center justify-between"><label>To</label>
            {!showCc && <button type="button" onClick={() => setShowCc(true)} className="text-[12px] font-bold text-accent hover:underline">Cc / Bcc</button>}
          </div>
          <div className="relative">
            {picked ? (
              <div className="input flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12.5px] font-semibold text-ink">
                  <Users size={13} className="text-accent" /> {picked.contact_name ? `${picked.contact_name} · ` : ''}{picked.company_name}
                  <span className="text-faint">{picked.email}</span>
                  <button onClick={unpick} className="ml-0.5 grid h-4 w-4 place-items-center rounded text-dim hover:bg-line"><X size={12} /></button>
                </span>
              </div>
            ) : (
              <input ref={toRef} className="input" value={to} onChange={(e) => setTo(e.target.value)}
                onFocus={() => sugs.length && setSugOpen(true)} onBlur={() => setTimeout(() => setSugOpen(false), 150)}
                placeholder="name@company.com — or start typing a lead's name" />
            )}
            {sugOpen && sugs.length > 0 && !picked && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
                {sugs.map((s) => (
                  <button key={s.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={13} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-ink">{s.company_name}{s.contact_name ? ` · ${s.contact_name}` : ''}</span>
                      <span className="block truncate text-[11.5px] text-faint">{s.email}</span>
                    </span>
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-faint">{s.stage}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showCc && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field !mb-0"><label>Cc</label><input className="input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma separated" /></div>
            <div className="field !mb-0"><label>Bcc</label><input className="input" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="comma separated" /></div>
          </div>
        )}

        {isNewContact && (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <input type="checkbox" checked={saveLead} onChange={(e) => setSaveLead(e.target.checked)} /> Save this recipient as a lead in {project?.name}
            </label>
            {saveLead && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input className="input !py-2" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (defaults to email domain)" />
                <input className="input !py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
              </div>
            )}
          </div>
        )}

        <div className="field !mb-0"><label>Subject</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" /></div>

        <div className="field !mb-0">
          <div className="flex items-center justify-between"><label>Message</label>
            <button type="button" onClick={writeWithAI} disabled={!!busy || !picked} title={picked ? 'Let the agent draft it' : 'Pick a lead to enable AI drafting'}
              className="flex items-center gap-1 text-[12px] font-bold text-accent hover:underline disabled:opacity-40">
              {busy === 'ai' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Draft with AI
            </button>
          </div>
          <RichEditor value={body} onChange={setBody} minHeight={260} placeholder="Write your message…" />
        </div>

        <AttachmentPicker files={files} onChange={setFiles} compact />

        {(picked || (isNewContact && saveLead)) && (
          <label className="flex items-center gap-2 text-[12.5px] text-dim">
            <input type="checkbox" checked={startFollowups} onChange={(e) => setStartFollowups(e.target.checked)} />
            Let the agent run automated follow-ups after this email {picked && picked.stage !== 'new' && <span className="text-faint">(already in sequence)</span>}
          </label>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost">Discard</button>
          <button onClick={send} disabled={busy === 'send'} className="btn btn-accent">
            {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send
          </button>
        </div>
      </div>
    </Modal>
  );
}
