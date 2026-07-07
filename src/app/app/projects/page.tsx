'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, FolderKanban, Check, Loader2, Star, Trash2 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Modal, EmptyState } from '@/components/ui';
import { LANGS, PROVIDERS } from '@/lib/constants';
import type { Project } from '@/lib/types';

const COLORS = ['#A435E8', '#E0457E', '#2563EB', '#16A34A', '#E08C1F', '#0EA5E9', '#8B5CF6'];

export default function ProjectsPage() {
  const { projects, project, setProjectId, refreshProjects } = useApp();
  const [editing, setEditing] = useState<Project | 'new' | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-dim">Each project is an isolated business — its own knowledge base, leads, outreach voice and language.</p>
        <button onClick={() => setEditing('new')} className="btn btn-accent"><Plus size={15} /> New project</button>
      </div>

      {projects.length === 0 ? (
        <Card><EmptyState icon={<FolderKanban size={38} />} title="No projects yet" sub="Create your first business to start hunting."
          action={<button onClick={() => setEditing('new')} className="btn btn-accent"><Plus size={15} /> New project</button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="cursor-pointer transition hover:border-accent" >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-[15px] font-black text-white" style={{ background: p.color }}>{p.name[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-ink">{p.name} {p.is_default && <Star size={13} className="text-amber-500" fill="currentColor" />}</div>
                  <div className="truncate text-[12px] text-dim">{p.product_description || p.website || 'No description yet'}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="stagetag">{LANGS.find((l) => l[0] === p.outreach_language)?.[1] || 'English'}</span>
                <span className="stagetag">follow-ups {p.follow_up_days.join('·')}d</span>
                {p.target_industries.slice(0, 2).map((t) => <span key={t} className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{t}</span>)}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setProjectId(p.id)} className={`btn btn-sm flex-1 justify-center ${project?.id === p.id ? 'btn-accent' : 'btn-ghost'}`}>
                  {project?.id === p.id ? <><Check size={13} /> Active</> : 'Switch to'}
                </button>
                <button onClick={() => setEditing(p)} className="btn btn-ghost btn-sm">Edit</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <ProjectModal project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { refreshProjects(); setEditing(null); }} />}
    </div>
  );
}

function ProjectModal({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: () => void }) {
  const { user, supabase, projects, setProjectId } = useApp();
  const [f, setF] = useState<Partial<Project>>(project || {
    name: '', color: COLORS[projects.length % COLORS.length], website: '', company_info: '', product_description: '',
    sales_instructions: '', target_industries: [], outreach_language: 'en', follow_up_days: [3, 7, 21], ai_model: '',
  });
  const [industries, setIndustries] = useState((project?.target_industries || []).join(', '));
  const [followDays, setFollowDays] = useState((project?.follow_up_days || [3, 7, 21]).join(', '));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Project, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!f.name) return toast.error('Project name is required');
    setBusy(true);
    const payload = {
      owner_id: user.id, name: f.name, color: f.color, website: f.website || null,
      company_info: f.company_info || null, product_description: f.product_description || null,
      sales_instructions: f.sales_instructions || null,
      target_industries: industries.split(',').map((s) => s.trim()).filter(Boolean),
      outreach_language: f.outreach_language || 'en',
      follow_up_days: followDays.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)),
      ai_model: f.ai_model || null, updated_at: new Date().toISOString(),
    };
    let newId = project?.id;
    if (project) {
      const { error } = await supabase.from('projects').update(payload).eq('id', project.id);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from('projects').insert({ ...payload, is_default: projects.length === 0 }).select().single();
      if (error) { setBusy(false); return toast.error(error.message); }
      newId = data.id;
    }
    setBusy(false);
    toast.success(project ? 'Project updated' : 'Project created');
    if (newId && !project) setProjectId(newId);
    onSaved();
  }

  async function remove() {
    if (!project || !confirm('Delete this project and all its data?')) return;
    await supabase.from('projects').delete().eq('id', project.id);
    toast.success('Project deleted'); onSaved();
  }

  const allModels = PROVIDERS.flatMap((p) => p.models);

  return (
    <Modal open onClose={onClose} title={project ? 'Edit project' : 'New project'} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field"><label>Project name *</label><input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Famies" /></div>
        <div className="field"><label>Website</label><input className="input" value={f.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://famies.se" /></div>
      </div>
      <div className="field"><label>What we do (product description)</label><textarea className="input min-h-[70px]" value={f.product_description || ''} onChange={(e) => set('product_description', e.target.value)} placeholder="We give families exclusive offers to experiences across Sweden." /></div>
      <div className="field"><label>Company info</label><textarea className="input min-h-[60px]" value={f.company_info || ''} onChange={(e) => set('company_info', e.target.value)} /></div>
      <div className="field"><label>Sales instructions (the voice &amp; goal for outreach)</label><textarea className="input min-h-[60px]" value={f.sales_instructions || ''} onChange={(e) => set('sales_instructions', e.target.value)} placeholder="Prioritise long-term partnerships over quick sales. Warm, personal, never corporate." /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field"><label>Target industries (comma separated)</label><input className="input" value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="Museums, Zoos, Trampoline parks" /></div>
        <div className="field"><label>Outreach language</label><select className="input" value={f.outreach_language} onChange={(e) => set('outreach_language', e.target.value)}>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field"><label>Follow-up cadence (days)</label><input className="input" value={followDays} onChange={(e) => setFollowDays(e.target.value)} placeholder="3, 7, 21" /></div>
        <div className="field"><label>Model override (optional)</label><select className="input" value={f.ai_model || ''} onChange={(e) => set('ai_model', e.target.value)}><option value="">Use workspace default</option>{allModels.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
      </div>
      <div className="field"><label>Colour</label><div className="flex gap-2">{COLORS.map((c) => (
        <button key={c} onClick={() => set('color', c)} className={`h-8 w-8 rounded-lg transition ${f.color === c ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c, boxShadow: f.color === c ? `0 0 0 2px ${c}` : undefined }} />
      ))}</div></div>
      <div className="mt-3 flex items-center justify-between">
        {project ? <button onClick={remove} className="btn btn-ghost text-bad"><Trash2 size={14} /> Delete</button> : <span />}
        <div className="flex gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {project ? 'Save' : 'Create'}</button></div>
      </div>
    </Modal>
  );
}
