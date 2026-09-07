'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Send, CheckCircle2, XCircle, Clock, ChevronDown, PenLine, Users, Paperclip, Sparkles, Hand, Trash2, Search } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Metric, Thinking } from '@/components/ui';
import { ComposeModal } from '@/components/ComposeModal';
import { BulkSendModal } from '@/components/BulkSendModal';
import { usePager, Pagination, useSelection, Checkbox, SelectAll, BulkBar, ConfirmDialog, sortBy, type SortDir } from '@/components/listing';
import { relTime } from '@/lib/utils';
import type { Message, Lead } from '@/lib/types';

type Meta = { manual?: boolean; mode?: 'compose' | 'bulk'; attachments?: string[]; cc?: string[]; bcc?: string[]; html?: string };

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'auto', label: 'Automated' },
  { key: 'manual', label: 'Manual' },
  { key: 'failed', label: 'Failed' },
];

const SORTS: { key: string; label: string; pick: (m: Message) => string | null; dir: SortDir }[] = [
  { key: 'newest', label: 'Newest first', pick: (m) => m.sent_at || m.created_at, dir: 'desc' },
  { key: 'oldest', label: 'Oldest first', pick: (m) => m.sent_at || m.created_at, dir: 'asc' },
  { key: 'subject', label: 'Subject A–Z', pick: (m) => m.subject, dir: 'asc' },
  { key: 'to', label: 'Recipient A–Z', pick: (m) => m.to_email, dir: 'asc' },
  { key: 'status', label: 'Status', pick: (m) => m.status, dir: 'asc' },
];

export default function OutreachPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState('all');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('newest');
  const [compose, setCompose] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const sel = useSelection();

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('project_id', project.id).eq('direction', 'outbound').order('created_at', { ascending: false }).limit(1000);
    const list = (data as Message[]) || [];
    setMsgs(list);
    const ids = [...new Set(list.map((m) => m.lead_id).filter(Boolean))] as string[];
    if (ids.length) {
      const map: Record<string, Lead> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data: ld } = await supabase.from('leads').select('id,company_name,contact_name').in('id', ids.slice(i, i + 200));
        (ld as Lead[] || []).forEach((l) => (map[l.id] = l));
      }
      setLeads(map);
    }
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { sel.clear(); }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const metaOf = (m: Message): Meta => (m.ai_meta || {}) as Meta;
  const isManual = (m: Message) => !!metaOf(m).manual;

  const visible = useMemo(() => {
    const list = msgs.filter((m) => {
      if (view === 'manual' && !isManual(m)) return false;
      if (view === 'auto' && isManual(m)) return false;
      if (view === 'failed' && m.status !== 'failed') return false;
      if (q) {
        const lead = m.lead_id ? leads[m.lead_id] : undefined;
        const hay = `${m.subject} ${m.to_email} ${m.body} ${lead?.company_name || ''} ${lead?.contact_name || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const s = SORTS.find((x) => x.key === sortKey) || SORTS[0];
    return sortBy(list, s.pick, s.dir);
  }, [msgs, view, q, sortKey, leads]);

  const pager = usePager(visible, 'outreach');
  useEffect(() => { pager.reset(); }, [view, q, sortKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageIds = pager.slice.map((m) => m.id);
  const allIds = visible.map((m) => m.id);

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    const { error } = await supabase.from('messages').delete().in('id', confirm);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(confirm.length === 1 ? 'Email deleted' : `${confirm.length} emails deleted`);
    sel.setMany(confirm, false); setConfirm(null); load();
  }

  if (!project) return <Thinking label="Loading…" />;

  const sent = msgs.filter((m) => m.status === 'sent').length;
  const failed = msgs.filter((m) => m.status === 'failed').length;
  const manual = msgs.filter((m) => isManual(m) && m.status === 'sent').length;
  const auto = sent - manual;

  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Sent" value={sent} icon={<Send size={13} />} />
        <Metric label="By the agent" value={auto} icon={<Sparkles size={13} />} />
        <Metric label="Sent manually" value={manual} icon={<Hand size={13} />} />
        <Metric label="Failed" value={failed} icon={<XCircle size={13} />} tone={failed ? 'down' : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${view === v.key ? 'bg-ink text-bg' : 'text-dim'}`}>
              {v.label}
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
          <button onClick={() => setBulk(true)} className="btn btn-ghost"><Users size={15} /> <span className="hidden sm:inline">Send to a list</span><span className="sm:hidden">List</span></button>
          <button onClick={() => setCompose(true)} className="btn btn-accent"><PenLine size={15} /> Compose</button>
        </div>
      </div>

      {loading ? <Thinking label="Loading outreach…" /> : visible.length === 0 ? (
        <Card>
          <EmptyState icon={<Send size={38} />}
            title={q ? 'Nothing matches your search' : view === 'manual' ? 'Nothing sent manually yet' : view === 'auto' ? 'The agent has not sent anything yet' : view === 'failed' ? 'No failed emails' : 'No outreach sent yet'}
            sub="Open a lead and let the agent write the first email, compose one yourself, or send to a list you already have."
            action={<div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setBulk(true)} className="btn btn-ghost"><Users size={15} /> Send to a list</button>
              <button onClick={() => setCompose(true)} className="btn btn-accent"><PenLine size={15} /> Compose an email</button>
            </div>} />
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <SelectAll pageIds={pageIds} allIds={allIds} sel={sel} noun="emails" />
          </div>
          {pager.slice.map((m) => {
            const meta = metaOf(m);
            const lead = m.lead_id ? leads[m.lead_id] : undefined;
            const who = lead ? `${lead.company_name}${lead.contact_name ? ` · ${lead.contact_name}` : ''}` : m.to_email;
            return (
              <div key={m.id} className={`group border-t border-line first:border-t-0 ${sel.has(m.id) ? 'bg-[var(--accent-soft)]' : ''}`}>
                <div className="flex items-center gap-3 p-4">
                  <Checkbox checked={sel.has(m.id)} onChange={() => sel.toggle(m.id)} label={`Select ${m.subject || 'email'}`} />
                  <button onClick={() => setOpen(open === m.id ? null : m.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{
                      background: m.status === 'sent' ? 'var(--green-soft)' : m.status === 'failed' ? 'var(--red-soft)' : 'var(--amber-soft)',
                      color: m.status === 'sent' ? 'var(--green)' : m.status === 'failed' ? 'var(--red)' : 'var(--amber)',
                    }}>{m.status === 'sent' ? <CheckCircle2 size={15} /> : m.status === 'failed' ? <XCircle size={15} /> : <Clock size={15} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold text-ink">{m.subject || '(no subject)'}</span>
                        {meta.manual ? (
                          <span className="flex-none rounded-md border border-line px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-faint">{meta.mode === 'bulk' ? 'Manual · list' : 'Manual'}</span>
                        ) : (
                          <span className="flex-none rounded-md px-1.5 py-px text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Agent</span>
                        )}
                        {meta.attachments && meta.attachments.length > 0 && <Paperclip size={12} className="flex-none text-faint" />}
                      </div>
                      <div className="truncate text-[12px] text-dim">{who}{lead && m.to_email ? ` · ${m.to_email}` : ''}</div>
                    </div>
                    <span className="whitespace-nowrap text-[11.5px] text-faint">{relTime(m.sent_at || m.created_at)}</span>
                    <ChevronDown size={15} className={`flex-none text-faint transition ${open === m.id ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => setConfirm([m.id])} aria-label="Delete email"
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-faint opacity-0 transition hover:bg-[var(--red-soft)] hover:text-bad group-hover:opacity-100 focus:opacity-100">
                    <Trash2 size={15} />
                  </button>
                </div>
                {open === m.id && (
                  <div className="border-t border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink">
                    {(meta.cc?.length || meta.bcc?.length) ? (
                      <div className="mb-2 text-[11.5px] text-faint">
                        {meta.cc?.length ? <div>Cc: {meta.cc.join(', ')}</div> : null}
                        {meta.bcc?.length ? <div>Bcc: {meta.bcc.join(', ')}</div> : null}
                      </div>
                    ) : null}
                    {meta.html ? <div className="rte-preview text-ink" dangerouslySetInnerHTML={{ __html: meta.html }} /> : <div className="whitespace-pre-wrap">{m.body}</div>}
                    {meta.attachments && meta.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {meta.attachments.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11.5px] font-semibold text-dim"><Paperclip size={11} /> {a}</span>)}
                      </div>
                    )}
                    {m.status === 'failed' && <div className="mt-2 text-[12px] font-semibold text-bad">Delivery failed. Check your Resend key and sender in Settings → Email.</div>}
                  </div>
                )}
              </div>
            );
          })}
          <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="emails" />
        </Card>
      )}

      <BulkBar count={sel.count} onClear={sel.clear}>
        <button onClick={() => setConfirm([...sel.selected])} className="btn btn-sm text-white" style={{ background: 'var(--red)' }}><Trash2 size={14} /> Delete</button>
      </BulkBar>

      <ConfirmDialog open={!!confirm} busy={busy} onCancel={() => setConfirm(null)} onConfirm={doDelete}
        title={confirm && confirm.length > 1 ? `Delete ${confirm.length} emails?` : 'Delete this email?'}
        body="This removes the record from Klientic only. Emails that were already delivered stay in the recipient's inbox." />

      <ComposeModal open={compose} onClose={() => setCompose(false)} onSent={() => { load(); refreshCounts(); }} />
      <BulkSendModal open={bulk} onClose={() => setBulk(false)} onDone={() => { load(); refreshCounts(); }} />
    </div>
  );
}
