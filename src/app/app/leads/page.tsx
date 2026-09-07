'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Plus, Users, Loader2, Search, Upload, Trash2 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, PriorityTag, StageTag, Score, EmptyState, Modal, Thinking } from '@/components/ui';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ImportLeadsModal } from '@/components/ImportLeadsModal';
import { TagInput } from '@/components/TagInput';
import { usePager, Pagination, useSelection, Checkbox, SelectAll, BulkBar, ConfirmDialog, useSort, sortBy, SortTh } from '@/components/listing';
import { STAGES } from '@/lib/utils';
import type { Lead } from '@/lib/types';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'A', label: 'Priority A' },
  { key: 'new', label: 'New' },
  { key: 'active', label: 'Active' },
  { key: 'positive', label: 'Won / Positive' },
  { key: 'import', label: 'Imported' },
];

type SortKey = 'company_name' | 'industry' | 'location' | 'fit_score' | 'opportunity_score' | 'priority' | 'stage' | 'created_at';
const STAGE_ORDER = ['new', 'contacted', 'followup1', 'followup2', 'followup3', 'positive', 'meeting', 'closed', 'lost'];

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
  const [confirm, setConfirm] = useState<{ ids: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const sel = useSelection();
  const { sort, toggle: toggleSort } = useSort<SortKey>({ key: 'created_at', dir: 'desc' });

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.get('discover')) setDiscoverOpen(true); if (params.get('import')) setImportOpen(true); }, [params]);
  useEffect(() => { sel.clear(); }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const list = leads.filter((l) => {
      if (q && !`${l.company_name} ${l.contact_name} ${l.email} ${l.industry} ${l.location}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === 'A') return l.priority === 'A';
      if (filter === 'new') return l.stage === 'new';
      if (filter === 'active') return ['contacted', 'followup1', 'followup2', 'followup3'].includes(l.stage);
      if (filter === 'positive') return ['positive', 'meeting', 'closed'].includes(l.stage);
      if (filter === 'import') return l.source === 'import';
      return true;
    });
    return sortBy(list, (l) => {
      switch (sort.key) {
        case 'stage': return STAGE_ORDER.indexOf(l.stage);
        case 'priority': return l.priority;
        case 'created_at': return l.created_at;
        default: return l[sort.key];
      }
    }, sort.dir);
  }, [leads, q, filter, sort]);

  const pager = usePager(filtered, 'leads');
  useEffect(() => { pager.reset(); }, [q, filter, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageIds = pager.slice.map((l) => l.id);
  const allIds = filtered.map((l) => l.id);

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    const { error } = await supabase.from('leads').delete().in('id', confirm.ids);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(confirm.ids.length === 1 ? 'Lead deleted' : `${confirm.ids.length} leads deleted`);
    sel.setMany(confirm.ids, false);
    setConfirm(null);
    if (active && confirm.ids.includes(active.id)) setActive(null);
    load(); refreshCounts();
  }

  async function bulkStage(stage: string) {
    const ids = [...sel.selected];
    const { error } = await supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).in('id', ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} leads moved to ${STAGES.find((s) => s.key === stage)?.label || stage}`);
    sel.clear(); load(); refreshCounts();
  }

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
          <>
            <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
              <SelectAll pageIds={pageIds} allIds={allIds} sel={sel} noun="leads" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="th w-8" />
                    <SortTh label="Company" k="company_name" sort={sort} onToggle={toggleSort} />
                    <SortTh label="Industry" k="industry" sort={sort} onToggle={toggleSort} />
                    <SortTh label="Location" k="location" sort={sort} onToggle={toggleSort} />
                    <SortTh label="Fit" k="fit_score" sort={sort} onToggle={toggleSort} defaultDir="desc" />
                    <SortTh label="Opp." k="opportunity_score" sort={sort} onToggle={toggleSort} defaultDir="desc" />
                    <SortTh label="Prio" k="priority" sort={sort} onToggle={toggleSort} />
                    <SortTh label="Stage" k="stage" sort={sort} onToggle={toggleSort} />
                    <th className="th">Contact</th>
                    <SortTh label="Added" k="created_at" sort={sort} onToggle={toggleSort} defaultDir="desc" />
                    <th className="th w-10" />
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((l) => (
                    <tr key={l.id} onClick={() => setActive(l)} className={`group cursor-pointer transition hover:bg-surface-2 ${sel.has(l.id) ? 'bg-[var(--accent-soft)]' : ''}`}>
                      <td className="td !pr-0"><Checkbox checked={sel.has(l.id)} onChange={() => sel.toggle(l.id)} label={`Select ${l.company_name}`} /></td>
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
                      <td className="td whitespace-nowrap text-[12px] text-faint">{new Date(l.created_at).toLocaleDateString()}</td>
                      <td className="td !pl-0">
                        <button onClick={(e) => { e.stopPropagation(); setConfirm({ ids: [l.id], label: l.company_name }); }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint opacity-0 transition hover:bg-[var(--red-soft)] hover:text-bad group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${l.company_name}`}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="leads" />
          </>
        )}
      </Card>

      <BulkBar count={sel.count} onClear={sel.clear}>
        <select className="rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-[12.5px] font-bold text-bg outline-none [&>option]:text-ink" value="" onChange={(e) => e.target.value && bulkStage(e.target.value)}>
          <option value="">Move to stage…</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button onClick={() => setConfirm({ ids: [...sel.selected], label: `${sel.count} leads` })} className="btn btn-sm text-white" style={{ background: 'var(--red)' }}><Trash2 size={14} /> Delete</button>
      </BulkBar>

      <ConfirmDialog open={!!confirm} busy={busy} onCancel={() => setConfirm(null)} onConfirm={doDelete}
        title={confirm && confirm.ids.length > 1 ? `Delete ${confirm.ids.length} leads?` : 'Delete this lead?'}
        body={<>This permanently removes <b className="text-ink">{confirm?.label}</b> together with their outreach history, replies and tasks. This cannot be undone.</>} />

      <DiscoverModal open={discoverOpen} onClose={() => setDiscoverOpen(false)} onDone={() => { load(); }} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} onDone={load} />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />
      <LeadDrawer lead={active} onClose={() => setActive(null)} onChange={() => { load(); refreshCounts(); }} />
    </div>
  );
}

const COUNTRIES = ['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland', 'Germany', 'Netherlands', 'Belgium', 'France', 'Spain', 'Italy', 'Portugal', 'Austria', 'Switzerland', 'Poland', 'Czech Republic', 'Ireland', 'United Kingdom', 'United States', 'Canada', 'Australia', 'New Zealand', 'United Arab Emirates', 'Saudi Arabia', 'India', 'Bangladesh', 'Pakistan', 'Singapore', 'Malaysia', 'Japan', 'South Korea', 'Brazil', 'Mexico', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Turkey'];
const LS_GEO = 'klientic.discover.geo';

function DiscoverModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { project } = useApp();
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [subcity, setSubcity] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  // remember the last geography so repeated searches are one click
  useEffect(() => {
    if (!open) return;
    try {
      const g = JSON.parse(localStorage.getItem(LS_GEO) || 'null');
      if (g) { setCountry(g.country || ''); setRegion(g.region || ''); setSubcity(g.subcity || ''); }
    } catch { /* ignore */ }
  }, [open]);

  async function run() {
    if (!project) return;
    if (!keywords.length) return toast.error('Add at least one keyword or niche');
    if (!country.trim()) return toast.error('Pick a country');
    setBusy(true);
    try {
      try { localStorage.setItem(LS_GEO, JSON.stringify({ country, region, subcity })); } catch { /* ignore */ }
      const res = await fetch('/api/leads/discover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, categories: keywords, country: country.trim(), region: region.trim(), subcity: subcity.trim(), count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.count} leads added to the pipeline`);
      onDone(); onClose(); setKeywords([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Discovery failed');
    } finally { setBusy(false); }
  }

  const where = [subcity, region, country].map((s) => s.trim()).filter(Boolean).join(', ');

  return (
    <Modal open={open} onClose={onClose} title="Find leads with AI">
      <p className="mb-4 text-[13px] text-dim">The agent searches for organisations that fit {project?.name}, scores each on fit &amp; opportunity, and drops them into your pipeline.</p>

      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Where</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field !mb-0"><label>Country *</label>
          <input className="input" list="discover-countries" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Sweden" autoComplete="off" />
          <datalist id="discover-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="field !mb-0"><label>Region / city</label>
          <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Stockholm" /></div>
        <div className="field !mb-0"><label>Sub-city / area <span className="text-faint">(optional)</span></label>
          <input className="input" value={subcity} onChange={(e) => setSubcity(e.target.value)} placeholder="e.g. Sigtuna, Vallentuna" /></div>
      </div>

      <div className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wide text-faint">What</div>
      <div className="field"><label>Keywords / categories / niches *</label>
        <TagInput value={keywords} onChange={setKeywords} placeholder="Type a niche and press Enter — e.g. Trampoline park, Museum, Padel club" />
        <p className="hint">Press <b>Enter</b> or type a <b>comma</b> to add each one. Paste a comma-separated list to add many at once. The agent spreads results across all niches.</p></div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field !mb-0"><label>How many leads</label>
          <input className="input" type="number" min={1} max={25} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div className="field !mb-0"><label>Search summary</label>
          <div className="input !bg-surface-2 text-[12.5px] text-dim">{keywords.length ? keywords.join(' · ') : '—'}{where ? ` in ${where}` : ''}</div></div>
      </div>

      {busy && <div className="mt-3"><Thinking label={`Searching ${where || 'everywhere'} for ${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? '…' : ''}`} /></div>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={run} disabled={busy} className="btn btn-accent">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Find {count} leads
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
