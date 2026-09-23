'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, CalendarCheck, Trophy, Trash2, MessagesSquare, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Thinking } from '@/components/ui';
import { ConfirmDialog } from '@/components/listing';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ComposeModal } from '@/components/ComposeModal';
import { ThreadDrawer } from '@/components/ThreadDrawer';
import { FollowupList } from '@/components/FollowupList';
import { buildThreads, type Thread } from '@/lib/threads';
import type { Lead, Message } from '@/lib/types';

const FOLLOWUP_STAGES = ['contacted', 'followup1', 'followup2', 'followup3'];

export default function FollowupsPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [threadKey, setThreadKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const [{ data: l }, { data: m }] = await Promise.all([
      supabase.from('leads').select('*').eq('project_id', project.id).in('stage', FOLLOWUP_STAGES).order('next_action_at', { ascending: true, nullsFirst: false }),
      supabase.from('messages').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(5000),
    ]);
    setLeads((l as Lead[]) || []);
    setMsgs((m as Message[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  const leadById = useMemo(() => { const map: Record<string, Lead> = {}; leads.forEach((x) => (map[x.id] = x)); return map; }, [leads]);
  const threads = useMemo(() => buildThreads(msgs, leadById), [msgs, leadById]);
  const threadByKey = useMemo(() => { const m: Record<string, Thread> = {}; threads.forEach((t) => (m[t.key] = t)); return m; }, [threads]);
  const threadFor = (id: string) => threadByKey[`lead:${id}`] || null;
  const refresh = () => { load(); refreshCounts(); };

  async function moveLead(leadId: string | null, toStage: string) {
    if (!leadId) return;
    const patch: Record<string, unknown> = { stage: toStage, updated_at: new Date().toISOString() };
    if (toStage === 'followup1') patch.next_action_at = new Date().toISOString();
    if (toStage === 'meeting' || toStage === 'closed') patch.next_action_at = null;
    const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
    if (error) return toast.error(error.message);
    toast.success(toStage === 'meeting' ? 'Moved to Booked meeting' : toStage === 'closed' ? 'Marked as sold' : 'Moved to Follow-up');
    setThreadKey(null); refresh();
  }
  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('leads').delete().eq('id', confirmDelete);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success('Lead deleted'); setConfirmDelete(null); setThreadKey(null); setDrawerLead(null); refresh();
  }
  const menuFor = (id: string) => [
    ...(threadFor(id) ? [{ label: 'History (all messages)', icon: <MessagesSquare size={14} />, run: () => setThreadKey(`lead:${id}`) }] : []),
    { label: 'Open lead details', icon: <ArrowRight size={14} />, run: () => setDrawerLead(leadById[id]) },
    { label: 'Mark as booked meeting', icon: <CalendarCheck size={14} />, run: () => moveLead(id, 'meeting') },
    { label: 'Mark as sold', icon: <Trophy size={14} />, run: () => moveLead(id, 'closed') },
    { label: 'Delete lead', icon: <Trash2 size={14} />, danger: true, run: () => setConfirmDelete(id) },
  ];

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-dim">Leads you have contacted who have not replied yet. Call, write, or let the agent send every due follow-up at once.</p>
        <div className="ml-auto flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2">
          <Search size={14} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent text-[13px] outline-none text-ink" />
        </div>
      </div>

      {loading ? <Thinking label="Loading follow-ups…" /> : (
        <FollowupList leads={leads} q={q} onOpen={(l) => { const t = threadFor(l.id); if (t) setThreadKey(t.key); else setDrawerLead(l); }}
          onWrite={setComposeLead} onChange={refresh} menuFor={menuFor} />
      )}

      <ThreadDrawer thread={threadKey ? threadByKey[threadKey] || null : null} onClose={() => setThreadKey(null)} onChange={refresh}
        onMove={(id, s) => moveLead(id, s)} onOpenLead={(l) => { setThreadKey(null); setDrawerLead(l); }} onDelete={(id) => setConfirmDelete(id)} />
      <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onChange={refresh} />
      <ComposeModal open={!!composeLead} lead={composeLead} onClose={() => setComposeLead(null)} onSent={refresh} />
      <ConfirmDialog open={!!confirmDelete} busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={doDelete} title="Delete this lead?"
        body={<>This permanently removes <b className="text-ink">{confirmDelete ? leadById[confirmDelete]?.company_name || 'the lead' : ''}</b> with every email, reply and task linked to it.</>} />
    </div>
  );
}
