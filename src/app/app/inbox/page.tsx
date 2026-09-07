'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Inbox as InboxIcon, Sparkles, Plus, Loader2, Send, Check, AlertTriangle, Trash2, Search } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Modal, Thinking } from '@/components/ui';
import { usePager, Pagination, useSelection, Checkbox, SelectAll, BulkBar, ConfirmDialog, sortBy, type SortDir } from '@/components/listing';
import { REPLY_CATEGORIES } from '@/lib/constants';
import { relTime } from '@/lib/utils';
import type { Message, Lead } from '@/lib/types';

const VIEWS = [
  { key: 'open', label: 'Needs attention' },
  { key: 'human', label: 'Human review' },
  { key: 'handled', label: 'Handled' },
  { key: 'all', label: 'All' },
];

const SORTS: { key: string; label: string; pick: (m: Message) => string | number | null; dir: SortDir }[] = [
  { key: 'newest', label: 'Newest first', pick: (m) => m.created_at, dir: 'desc' },
  { key: 'oldest', label: 'Oldest first', pick: (m) => m.created_at, dir: 'asc' },
  { key: 'category', label: 'Category', pick: (m) => m.category, dir: 'asc' },
  { key: 'sender', label: 'Sender A–Z', pick: (m) => m.from_email, dir: 'asc' },
];

export default function InboxPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [view, setView] = useState('open');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('newest');
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const sel = useSelection();

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('project_id', project.id).eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1000);
    const list = (data as Message[]) || [];
    setMsgs(list);
    const leadIds = [...new Set(list.map((m) => m.lead_id).filter(Boolean))] as string[];
    if (leadIds.length) {
      const map: Record<string, Lead> = {};
      for (let i = 0; i < leadIds.length; i += 200) {
        const { data: ld } = await supabase.from('leads').select('*').in('id', leadIds.slice(i, i + 200));
        (ld as Lead[] || []).forEach((l) => (map[l.id] = l));
      }
      setLeads(map);
    }
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { sel.clear(); }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const list = msgs.filter((m) => {
      if (view === 'open' && m.handled) return false;
      if (view === 'human' && (!m.needs_human || m.handled)) return false;
      if (view === 'handled' && !m.handled) return false;
      if (q) {
        const lead = m.lead_id ? leads[m.lead_id] : undefined;
        const hay = `${m.subject} ${m.from_email} ${m.body} ${m.category} ${lead?.company_name || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const s = SORTS.find((x) => x.key === sortKey) || SORTS[0];
    return sortBy(list, s.pick, s.dir);
  }, [msgs, view, q, sortKey, leads]);

  const pager = usePager(visible, 'inbox', 10);
  useEffect(() => { pager.reset(); }, [view, q, sortKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageIds = pager.slice.map((m) => m.id);
  const allIds = visible.map((m) => m.id);

  async function bulkHandled(handled: boolean) {
    const ids = [...sel.selected];
    const { error } = await supabase.from('messages').update({ handled }).in('id', ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} marked ${handled ? 'handled' : 'open'}`);
    sel.clear(); load(); refreshCounts();
  }

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    const { error } = await supabase.from('messages').delete().in('id', confirm);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(confirm.length === 1 ? 'Reply deleted' : `${confirm.length} replies deleted`);
    sel.setMany(confirm, false); setConfirm(null); load(); refreshCounts();
  }

  if (!project) return <Thinking label="Loading…" />;

  const openCount = msgs.filter((m) => !m.handled).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${view === v.key ? 'bg-ink text-bg' : 'text-dim'}`}>
              {v.label}{v.key === 'open' && openCount > 0 && <span className="ml-1.5 rounded-md bg-[var(--accent-soft)] px-1.5 text-[10.5px] text-accent">{openCount}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2 sm:flex">
            <Search size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-32 bg-transparent text-[13px] outline-none text-ink" />
          </div>
          <select className="input !w-auto !py-2 !text-[12.5px]" value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={() => setLogOpen(true)} className="btn btn-accent"><Plus size={15} /> Log a reply</button>
        </div>
      </div>

      {loading ? <Thinking label="Loading inbox…" /> : visible.length === 0 ? (
        <Card><EmptyState icon={<InboxIcon size={38} />} title={q ? 'Nothing matches your search' : 'Inbox zero'}
          sub="Replies to your sending address arrive here automatically and are classified by the agent. You can also log one by hand."
          action={<button onClick={() => setLogOpen(true)} className="btn btn-accent"><Plus size={15} /> Log a reply</button>} /></Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <SelectAll pageIds={pageIds} allIds={allIds} sel={sel} noun="replies" />
          </div>
          {pager.slice.map((m) => (
            <ReplyCard key={m.id} msg={m} lead={m.lead_id ? leads[m.lead_id] : undefined}
              selected={sel.has(m.id)} onSelect={() => sel.toggle(m.id)} onDelete={() => setConfirm([m.id])}
              onChange={() => { load(); refreshCounts(); }} />
          ))}
          <Card className="!p-0">
            <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="replies" />
          </Card>
        </div>
      )}

      <BulkBar count={sel.count} onClear={sel.clear}>
        <button onClick={() => bulkHandled(true)} className="btn btn-sm border border-white/20 text-bg hover:bg-white/10"><Check size={14} /> Mark handled</button>
        <button onClick={() => bulkHandled(false)} className="btn btn-sm border border-white/20 text-bg hover:bg-white/10">Reopen</button>
        <button onClick={() => setConfirm([...sel.selected])} className="btn btn-sm text-white" style={{ background: 'var(--red)' }}><Trash2 size={14} /> Delete</button>
      </BulkBar>

      <ConfirmDialog open={!!confirm} busy={busy} onCancel={() => setConfirm(null)} onConfirm={doDelete}
        title={confirm && confirm.length > 1 ? `Delete ${confirm.length} replies?` : 'Delete this reply?'}
        body="This removes the reply from Klientic. The lead itself and your sent emails are kept." />

      {logOpen && <LogModal projectId={project.id} onClose={() => setLogOpen(false)} onDone={() => { load(); refreshCounts(); }} />}
    </div>
  );
}

function ReplyCard({ msg, lead, selected, onSelect, onDelete, onChange }: {
  msg: Message; lead?: Lead; selected: boolean; onSelect: () => void; onDelete: () => void; onChange: () => void;
}) {
  const { supabase } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [reply, setReply] = useState<{ subject: string; body: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const meta = msg.ai_meta as { summary?: string; draft?: { subject: string; body: string } | null; confidence?: number; attachments?: string[] };
  const cat = REPLY_CATEGORIES.find((c) => c.key === msg.category);
  const long = (msg.body || '').length > 600;

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

  async function setHandled(handled: boolean) {
    await supabase.from('messages').update({ handled }).eq('id', msg.id);
    toast.success(handled ? 'Marked handled' : 'Reopened'); onChange();
  }

  return (
    <Card className={selected ? '!border-accent' : undefined}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5"><Checkbox checked={selected} onChange={onSelect} label="Select reply" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{lead?.company_name || msg.from_email || 'Unknown sender'}</span>
            {lead && msg.from_email && <span className="text-[12px] text-faint">{msg.from_email}</span>}
            {cat && <span className="tag" style={{ background: `var(--${cat.tone}-soft, var(--accent-soft))`, color: `var(--${cat.tone === 'ok' ? 'green' : cat.tone === 'bad' ? 'red' : cat.tone === 'warn' ? 'amber' : cat.tone === 'info' ? 'blue' : 'accent'})` }}>{cat.label}</span>}
            {msg.needs_human && <span className="tag" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><AlertTriangle size={11} /> human review</span>}
            {msg.handled && <span className="tag" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Check size={11} /> handled</span>}
            <span className="ml-auto text-[11.5px] text-faint">{relTime(msg.created_at)}</span>
            <button onClick={onDelete} aria-label="Delete reply" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-[var(--red-soft)] hover:text-bad"><Trash2 size={14} /></button>
          </div>
          {msg.subject && <div className="mt-1 text-[13px] font-semibold text-ink">{msg.subject}</div>}
          <p className={`mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-dim ${long && !expanded ? 'line-clamp-6' : ''}`}>{msg.body}</p>
          {long && <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-[12px] font-bold text-accent hover:underline">{expanded ? 'Show less' : 'Show full message'}</button>}
          {meta?.attachments && meta.attachments.length > 0 && <div className="mt-2 text-[11.5px] text-faint">Attachments: {meta.attachments.join(', ')}</div>}
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
          <button onClick={() => setReply({ subject: msg.subject ? (msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`) : `Re: ${lead?.company_name || ''}`, body: '' })} className="btn btn-ghost btn-sm"><Send size={13} /> Reply</button>
          {msg.handled
            ? <button onClick={() => setHandled(false)} className="btn btn-ghost btn-sm">Reopen</button>
            : <button onClick={() => setHandled(true)} className="btn btn-ghost btn-sm"><Check size={13} /> Mark handled</button>}
        </div>
      )}
    </Card>
  );
}

function LogModal({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: () => void }) {
  const { supabase } = useApp();
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
  return (
    <Modal open onClose={onClose} title="Log an incoming reply">
      <div className="field"><label>From lead (optional)</label>
        <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}><option value="">— unlinked —</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.company_name}</option>)}</select></div>
      <div className="field"><label>Reply text</label><textarea className="input min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the email reply you received…" /></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Classify</button></div>
    </Modal>
  );
}
