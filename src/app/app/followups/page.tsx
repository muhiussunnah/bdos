'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Thinking } from '@/components/ui';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ComposeModal } from '@/components/ComposeModal';
import { FollowupList } from '@/components/FollowupList';
import type { Lead } from '@/lib/types';

const FOLLOWUP_STAGES = ['contacted', 'followup1', 'followup2', 'followup3'];

export default function FollowupsPage() {
  const { project, supabase, refreshCounts } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('project_id', project.id)
      .in('stage', FOLLOWUP_STAGES).order('next_action_at', { ascending: true, nullsFirst: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-dim">Leads you have contacted who have not replied yet. Nudge them one by one, or let the agent send every due follow-up at once.</p>
        <div className="ml-auto flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2">
          <Search size={14} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent text-[13px] outline-none text-ink" />
        </div>
      </div>

      {loading ? <Thinking label="Loading follow-ups…" /> : (
        <FollowupList leads={leads} q={q} onOpen={setDrawerLead} onWrite={setComposeLead} onChange={() => { load(); refreshCounts(); }} />
      )}

      <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onChange={() => { load(); refreshCounts(); }} />
      <ComposeModal open={!!composeLead} lead={composeLead} onClose={() => setComposeLead(null)} onSent={() => { load(); refreshCounts(); }} />
    </div>
  );
}
