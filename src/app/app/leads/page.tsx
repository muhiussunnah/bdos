'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Plus, Users, Loader2, Search, Upload } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, PriorityTag, StageTag, Score, EmptyState, Modal, Thinking } from '@/components/ui';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ImportLeadsModal } from '@/components/ImportLeadsModal';
import type { Lead } from '@/lib/types';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'A', label: 'Priority A' },
  { key: 'new', label: 'New' },
  { key: 'active', label: 'Active' },
  { key: 'positive', label: 'Won / Positive' },
  { key: 'import', label: 'Imported' },
];

function LeadsInner() {
  const { project, supabase, refreshCounts } = useApp();
  const params = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [active, setActive] = useState<Lead | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.get('discover')) setDiscoverOpen(true); if (params.get('import')) setImportOpen(true); }, [params]);

  const filtered = leads.filter((l) => {
    if (q && !`${l.company_name} ${l.contact_name} ${l.industry} ${l.location}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'A') return l.priority === 'A';
    if (filter === 'new') return l.stage === 'new';
    if (filter === 'active') return ['contacted', 'followup1', 'followup2', 'followup3'].includes(l.stage);
    if (filter === 'positive') return ['positive', 'meeting', 'closed'].includes(l.stage);
    if (filter === 'import') return l.source === 'import';
    return true;
  });

  if (!project) return <Thinking label="Loading project…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${filter === f.key ? 'bg-ink text-bg' : 'text-dim'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2 sm:flex">
            <Search size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="w-32 bg-transparent text-[13px] outline-none text-ink" />
          </div>
          <button onClick={() => setManualOpen(true)} className="btn btn-ghost"><Plus size={15} /> Add</button>
          <button onClick={() => setImportOpen(true)} className="btn btn-ghost"><Upload size={15} /> <span className="hidden sm:inline">Import list</span><span className="sm:hidden">Import</span></button>
          <button onClick={() => setDiscoverOpen(true)} className="btn btn-accent"><Sparkles size={15} /> Find with AI</button>
        </div>
      </div>

      <Card className="!p-0">
        {loading ? (
          <div className="p-6"><Thinking label="Loading leads…" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={38} />} title="No leads here yet"
            sub='Use "Find with AI" to fill the pipeline, import a list you already have, or add one manually.'
            action={<div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setImportOpen(true)} className="btn btn-ghost"><Upload size={15} /> Import my list</button>
              <button onClick={() => setDiscoverOpen(true)} className="btn btn-accent"><Sparkles size={15} /> Find leads with AI</button>
            </div>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['Company', 'Industry', 'Location', 'Fit', 'Opp.', 'Prio', 'Stage', 'Contact'].map((h) => <th key={h} className="th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} onClick={() => setActive(l)} className="cursor-pointer transition hover:bg-surface-2">
                    <td className="td">
                      <div className="flex items-center gap-1.5 font-bold text-ink">{l.company_name}
                        {l.source === 'import' && <span className="rounded-md border border-line px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-faint">Imported</span>}
                      </div>
                      {l.website && <div className="text-[11.5px] text-faint">{l.website.replace(/^https?:\/\//, '')}</div>}
                    </td>
                    <td className="td text-dim">{l.industry || '—'}</td>
                    <td className="td text-dim">{l.location || '—'}</td>
                    <td className="td"><Score value={l.fit_score} /></td>
                    <td className="td"><Score value={l.opportunity_score} /></td>
                    <td className="td"><PriorityTag p={l.priority} /></td>
                    <td className="td"><StageTag stage={l.stage} /></td>
                    <td className="td">
                      {l.contact_name ? <div className="font-semibold text-ink">{l.contact_name}</div> : <span className="text-faint">—</span>}
                      {l.email && <div className="text-[11.5px] text-faint">{l.email}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DiscoverModal open={discoverOpen} onClose={() => setDiscoverOpen(false)} onDone={() => { load(); }} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} onDone={load} />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />
      <LeadDrawer lead={active} onClose={() => setActive(null)} onChange={() => { load(); refreshCounts(); }} />
    </div>
  );
}

function DiscoverModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { project } = useApp();
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!project || !category) return toast.error('Enter a category');
    setBusy(true);
    try {
      const res = await fetch('/api/leads/discover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, category, area, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.count} leads added to the pipeline`);
      onDone(); onClose(); setCategory(''); setArea('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Discovery failed');
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Find leads with AI">
      <p className="mb-4 text-[13px] text-dim">The agent searches for organisations that fit {project?.name}, scores each on fit &amp; opportunity, and drops them into your pipeline.</p>
      <div className="field"><label>Category</label>
        <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Trampoline park, Museum, SaaS agency" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label>Area / region</label>
          <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Stockholm, Nordics" /></div>
        <div className="field"><label>How many</label>
          <input className="input" type="number" min={1} max={25} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
      </div>
      {busy && <Thinking label={`Searching for ${category || 'leads'}…`} />}
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={run} disabled={busy} className="btn btn-accent">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Search
        </button>
      </div>
    </Modal>
  );
}

function ManualModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { project, user, supabase } = useApp();
  const [f, setF] = useState({ company_name: '', website: '', industry: '', location: '', contact_name: '', role: '', email: '', phone: '' });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!project || !f.company_name) return toast.error('Company name is required');
    setBusy(true);
    const { error } = await supabase.from('leads').insert({
      ...f, project_id: project.id, owner_id: user.id, source: 'manual',
      fit_score: 50, opportunity_score: 50, priority: 'B', stage: 'new',
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Lead added');
    setF({ company_name: '', website: '', industry: '', location: '', contact_name: '', role: '', email: '', phone: '' });
    onDone(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a lead">
      <div className="grid grid-cols-2 gap-3">
        {([['company_name', 'Company *'], ['website', 'Website'], ['industry', 'Industry'], ['location', 'Location'],
          ['contact_name', 'Contact name'], ['role', 'Role'], ['email', 'Email'], ['phone', 'Phone']] as const).map(([k, label]) => (
          <div className="field" key={k}><label>{label}</label>
            <input className="input" value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={save} disabled={busy} className="btn btn-accent">Add lead</button>
      </div>
    </Modal>
  );
}

export default function LeadsPage() {
  return <Suspense fallback={<Thinking label="Loading…" />}><LeadsInner /></Suspense>;
}
