'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Inbox as InboxIcon, Sparkles, Plus, Loader2, Send, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Modal, Thinking } from '@/components/ui';
import { REPLY_CATEGORIES } from '@/lib/constants';
import { relTime } from '@/lib/utils';
import type { Message, Lead } from '@/lib/types';

export default function InboxPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [showHandled, setShowHandled] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('project_id', project.id).eq('direction', 'inbound').order('created_at', { ascending: false });
    const list = (data as Message[]) || [];
    setMsgs(list);
    const leadIds = [...new Set(list.map((m) => m.lead_id).filter(Boolean))] as string[];
    if (leadIds.length) {
      const { data: ld } = await supabase.from('leads').select('*').in('id', leadIds);
      const map: Record<string, Lead> = {};
      (ld as Lead[] || []).forEach((l) => (map[l.id] = l));
      setLeads(map);
    }
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  const visible = msgs.filter((m) => showHandled || !m.handled);

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[13px] text-dim">
          <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} /> Show handled
        </label>
        <button onClick={() => setLogOpen(true)} className="btn btn-accent"><Plus size={15} /> Log a reply</button>
      </div>

      {loading ? <Thinking label="Loading inbox…" /> : visible.length === 0 ? (
        <Card><EmptyState icon={<InboxIcon size={38} />} title="Inbox zero" sub="Incoming replies are classified automatically. Log one to see the agent triage it."
          action={<button onClick={() => setLogOpen(true)} className="btn btn-accent"><Plus size={15} /> Log a reply</button>} /></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => <ReplyCard key={m.id} msg={m} lead={m.lead_id ? leads[m.lead_id] : undefined} onChange={() => { load(); refreshCounts(); }} />)}
        </div>
      )}

      {logOpen && <LogModal projectId={project.id} onClose={() => setLogOpen(false)} onDone={() => { load(); refreshCounts(); }} />}
    </div>
  );
}

function ReplyCard({ msg, lead, onChange }: { msg: Message; lead?: Lead; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reply, setReply] = useState<{ subject: string; body: string } | null>(null);
  const meta = msg.ai_meta as { summary?: string; draft?: { subject: string; body: string } | null; confidence?: number };
  const cat = REPLY_CATEGORIES.find((c) => c.key === msg.category);

  async function classify() {
    setBusy('classify');
    try {
      const res = await fetch('/api/inbox/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Classified: ${data.category}`); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function sendReply() {
    if (!reply) return;
    setBusy('send');
    try {
      const res = await fetch('/api/inbox/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id, subject: reply.subject, body: reply.body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Reply sent'); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function markHandled() {
    const { createClient } = await import('@/lib/supabase/client');
    await createClient().from('messages').update({ handled: true }).eq('id', msg.id);
    toast.success('Marked handled'); onChange();
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{lead?.company_name || msg.from_email || 'Unknown sender'}</span>
            {cat && <span className="tag" style={{ background: `var(--${cat.tone}-soft, var(--accent-soft))`, color: `var(--${cat.tone === 'ok' ? 'green' : cat.tone === 'bad' ? 'red' : cat.tone === 'warn' ? 'amber' : cat.tone === 'info' ? 'blue' : 'accent'})` }}>{cat.label}</span>}
            {msg.needs_human && <span className="tag" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><AlertTriangle size={11} /> human review</span>}
            {msg.handled && <span className="tag" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Check size={11} /> handled</span>}
            <span className="ml-auto text-[11.5px] text-faint">{relTime(msg.created_at)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-dim">{msg.body}</p>
          {meta?.summary && <div className="aibox mt-3"><div className="aihead"><Sparkles size={13} /> Agent read</div><p className="text-[13px] text-ink">{meta.summary}</p></div>}
        </div>
      </div>

      {reply ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <input className="input" value={reply.subject} onChange={(e) => setReply({ ...reply, subject: e.target.value })} />
          <textarea className="input min-h-[140px]" value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} />
          <div className="flex gap-2"><button onClick={sendReply} disabled={busy === 'send'} className="btn btn-accent">{busy === 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send reply</button>
            <button onClick={() => setReply(null)} className="btn btn-ghost">Cancel</button></div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {!msg.category && <button onClick={classify} disabled={!!busy} className="btn btn-accent btn-sm">{busy === 'classify' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Classify</button>}
          {meta?.draft && <button onClick={() => setReply(meta.draft!)} className="btn btn-ghost btn-sm"><Sparkles size={13} /> Use AI draft</button>}
          <button onClick={() => setReply({ subject: `Re: ${lead?.company_name || ''}`, body: '' })} className="btn btn-ghost btn-sm"><Send size={13} /> Reply</button>
          {!msg.handled && <button onClick={markHandled} className="btn btn-ghost btn-sm"><Check size={13} /> Mark handled</button>}
        </div>
      )}
    </Card>
  );
}

function LogModal({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: () => void }) {
  const { supabase, project } = useApp();
  const [text, setText] = useState(''); const [leadId, setLeadId] = useState(''); const [leads, setLeads] = useState<Lead[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.from('leads').select('*').eq('project_id', projectId).in('stage', ['contacted', 'followup1', 'followup2', 'followup3']).then(({ data }) => setLeads((data as Lead[]) || [])); }, [supabase, projectId]);

  async function submit() {
    if (!text) return toast.error('Paste the reply text');
    setBusy(true);
    try {
      const res = await fetch('/api/inbox/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, text, leadId: leadId || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Logged & classified: ${data.category}`); onDone(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }
  void project;
  return (
    <Modal open onClose={onClose} title="Log an incoming reply">
      <div className="field"><label>From lead (optional)</label>
        <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}><option value="">— unlinked —</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.company_name}</option>)}</select></div>
      <div className="field"><label>Reply text</label><textarea className="input min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the email reply you received…" /></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Classify</button></div>
    </Modal>
  );
}
