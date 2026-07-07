'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Send, Sparkles, CalendarClock, Trash2, Mail, Phone, Globe, Linkedin, Loader2, ArrowRight, Copy } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Drawer, PriorityTag, StageTag, Score, Thinking } from '@/components/ui';
import { STAGES } from '@/lib/utils';
import type { Lead } from '@/lib/types';

type Prep = { summary: string; what_they_do: string; why_relevant: string; talking_points: string[]; objections: string[]; next_steps: string[] };

export function LeadDrawer({ lead, onClose, onChange }: { lead: Lead | null; onClose: () => void; onChange: () => void }) {
  const { supabase } = useApp();
  const [tab, setTab] = useState<'overview' | 'outreach' | 'prep'>('overview');
  const [draft, setDraft] = useState<{ subject: string; body: string; step: number } | null>(null);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { setTab('overview'); setDraft(null); setPrep(null); }, [lead?.id]);

  if (!lead) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  async function generate() {
    setBusy('gen'); setTab('outreach');
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead!.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft({ subject: data.subject, body: data.body, step: data.step });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function send() {
    if (!draft) return;
    setBusy('send');
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead!.id, subject: draft.subject, body: draft.body, step: draft.step }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Sent — lead moved to Contacted');
      setDraft(null); onChange(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Send failed'); }
    finally { setBusy(null); }
  }

  async function meetingPrep() {
    setBusy('prep'); setTab('prep');
    try {
      const res = await fetch('/api/meeting-prep', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead!.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrep(data.prep);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function moveStage(stage: string) {
    await supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', lead!.id);
    toast.success(`Moved to ${stage}`);
    onChange();
  }

  async function del() {
    if (!confirm('Delete this lead?')) return;
    await supabase.from('leads').delete().eq('id', lead!.id);
    toast.success('Lead deleted'); onChange(); onClose();
  }

  return (
    <Drawer open={!!lead} onClose={onClose} title={lead.company_name}
      sub={[lead.industry, lead.location].filter(Boolean).join(' · ')}
      footer={
        <div className="flex gap-2">
          <button onClick={generate} disabled={!!busy} className="btn btn-accent flex-1 justify-center">
            {busy === 'gen' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Write outreach
          </button>
          <button onClick={meetingPrep} disabled={!!busy} className="btn btn-ghost">
            <CalendarClock size={15} /> Meeting prep
          </button>
          <button onClick={del} className="btn btn-ghost !px-3 text-bad"><Trash2 size={15} /></button>
        </div>
      }>
      <div className="mb-4 flex items-center gap-2">
        <PriorityTag p={lead.priority} /><StageTag stage={lead.stage} />
        <div className="ml-auto flex items-center gap-3 text-[12px] text-dim">
          <span>Fit <Score value={lead.fit_score} /></span>
          <span>Opp <Score value={lead.opportunity_score} /></span>
        </div>
      </div>

      <div className="mb-4 inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
        {(['overview', 'outreach', 'prep'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold capitalize transition ${tab === t ? 'bg-ink text-bg' : 'text-dim'}`}>
            {t === 'prep' ? 'Meeting prep' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {lead.reason && (
            <div className="aibox">
              <div className="aihead"><Sparkles size={14} /> Why relevant</div>
              <p className="text-[13px] leading-relaxed text-ink">{lead.reason}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            <Field icon={<Mail size={14} />} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
            <Field icon={<Phone size={14} />} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
            <Field icon={<Globe size={14} />} label="Website" value={lead.website} href={lead.website || undefined} />
            <Field icon={<Linkedin size={14} />} label="LinkedIn" value={lead.linkedin_url} href={lead.linkedin_url || undefined} />
          </div>
          {(lead.contact_name || lead.role) && (
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-faint">Contact</div>
              <div className="mt-1 font-bold text-ink">{lead.contact_name || '—'}</div>
              {lead.role && <div className="text-[12.5px] text-dim">{lead.role}</div>}
            </div>
          )}
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Move in pipeline</div>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button key={s.key} onClick={() => moveStage(s.key)}
                  className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${lead.stage === s.key ? 'border-accent bg-[var(--accent-soft)] text-accent' : 'border-line text-dim hover:border-line-2'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'outreach' && (
        <div className="space-y-3">
          {busy === 'gen' ? <Thinking label="Writing a personal email…" /> : draft ? (
            <>
              <div className="field"><label>Subject</label>
                <input className="input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
              <div className="field"><label>Body {draft.step > 0 && <span className="text-accent">· follow-up #{draft.step}</span>}</label>
                <textarea className="input min-h-[220px]" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></div>
              <div className="flex gap-2">
                <button onClick={send} disabled={busy === 'send'} className="btn btn-accent flex-1 justify-center">
                  {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Approve &amp; send
                </button>
                <button onClick={() => { navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`); toast.success('Copied'); }} className="btn btn-ghost"><Copy size={15} /></button>
                <button onClick={generate} className="btn btn-ghost"><Sparkles size={15} /> Rewrite</button>
              </div>
              <p className="hint">Sends via your Resend sender. To: {lead.email || '⚠ no email on this lead'}</p>
            </>
          ) : (
            <button onClick={generate} className="btn btn-accent w-full justify-center"><Sparkles size={15} /> Generate email <ArrowRight size={15} /></button>
          )}
        </div>
      )}

      {tab === 'prep' && (
        <div className="space-y-3">
          {busy === 'prep' ? <Thinking label="Researching &amp; summarising…" /> : prep ? (
            <>
              <PrepBlock title="Summary" text={prep.summary} />
              <PrepBlock title="What they do" text={prep.what_they_do} />
              <PrepBlock title="Why relevant" text={prep.why_relevant} />
              <PrepList title="Talking points" items={prep.talking_points} />
              <PrepList title="Likely objections" items={prep.objections} />
              <PrepList title="Next steps" items={prep.next_steps} />
            </>
          ) : (
            <button onClick={meetingPrep} className="btn btn-accent w-full justify-center"><CalendarClock size={15} /> Prepare me for the call</button>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Field({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  const inner = (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5">
      <span className="text-faint">{icon}</span>
      <div className="min-w-0"><div className="text-[10.5px] font-bold uppercase tracking-wide text-faint">{label}</div>
        <div className="truncate text-[13px] font-semibold text-ink">{value}</div></div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer" className="block hover:opacity-80">{inner}</a> : inner;
}

function PrepBlock({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return <div><div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">{title}</div><p className="text-[13px] leading-relaxed text-ink">{text}</p></div>;
}
function PrepList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">{title}</div>
      <ul className="space-y-1.5">{items.map((it, i) => (
        <li key={i} className="flex gap-2 text-[13px] text-ink"><span className="text-accent">›</span>{it}</li>))}</ul></div>
  );
}
