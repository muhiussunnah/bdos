'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { BookOpen, Plus, Globe, FileText, Trash2, Loader2, Link2 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Modal, Thinking } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { KnowledgeDoc } from '@/lib/types';

export default function KnowledgePage() {
  const { project, user, supabase } = useApp();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'note' | 'web' | null>(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('knowledge_documents').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
    setDocs((data as KnowledgeDoc[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    await supabase.from('knowledge_documents').delete().eq('id', id);
    toast.success('Removed'); load();
  }

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-dim">Everything here grounds the agent. It uses these facts when writing outreach and replies — and never invents beyond them.</p>
        <div className="flex gap-2">
          <button onClick={() => setModal('web')} className="btn btn-ghost"><Globe size={15} /> Add website</button>
          <button onClick={() => setModal('note')} className="btn btn-accent"><Plus size={15} /> Add note</button>
        </div>
      </div>

      {loading ? <Thinking label="Loading knowledge base…" /> : docs.length === 0 ? (
        <Card><EmptyState icon={<BookOpen size={38} />} title="Knowledge base is empty" sub="Add your pitch, pricing, sales scripts or a website so the agent speaks with real facts."
          action={<button onClick={() => setModal('note')} className="btn btn-accent"><Plus size={15} /> Add first note</button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((d) => (
            <Card key={d.id} className="flex gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {d.kind === 'website' ? <Globe size={18} /> : <FileText size={18} />}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-ink">{d.title}</div>
                {d.source_url && <a href={d.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-[12px] text-accent"><Link2 size={11} /> {d.source_url}</a>}
                <p className="mt-1 line-clamp-2 text-[12px] text-dim">{d.content?.slice(0, 160)}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-faint">
                  <span>{d.kind}</span><span>·</span><span>~{d.tokens} tokens</span><span>·</span><span>{relTime(d.created_at)}</span>
                </div>
              </div>
              <button onClick={() => del(d.id)} className="text-faint hover:text-bad"><Trash2 size={15} /></button>
            </Card>
          ))}
        </div>
      )}

      {modal === 'note' && <NoteModal projectId={project.id} userId={user.id} onClose={() => setModal(null)} onDone={load} />}
      {modal === 'web' && <WebModal projectId={project.id} onClose={() => setModal(null)} onDone={load} />}
    </div>
  );
}

function NoteModal({ projectId, userId, onClose, onDone }: { projectId: string; userId: string; onClose: () => void; onDone: () => void }) {
  const { supabase } = useApp();
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [busy, setBusy] = useState(false);
  async function save() {
    if (!title || !content) return toast.error('Title and content required');
    setBusy(true);
    const { error } = await supabase.from('knowledge_documents').insert({ project_id: projectId, owner_id: userId, title, kind: 'note', content, tokens: Math.round(content.length / 4) });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Added to knowledge base'); onDone(); onClose();
  }
  return (
    <Modal open onClose={onClose} title="Add a note">
      <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pricing & packages" /></div>
      <div className="field"><label>Content</label><textarea className="input min-h-[200px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your pitch, pricing, FAQ, objection handling…" /></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={save} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : 'Add'}</button></div>
    </Modal>
  );
}

function WebModal({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: () => void }) {
  const [url, setUrl] = useState(''); const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false);
  async function ingest() {
    if (!url) return toast.error('Enter a URL');
    setBusy(true);
    try {
      const res = await fetch('/api/knowledge/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, url, title }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Website captured'); onDone(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Add a website">
      <div className="field"><label>URL</label><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourcompany.com/about" /></div>
      <div className="field"><label>Title (optional)</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <p className="hint mb-3">We fetch the page and store a clean text snapshot the agent can reference.</p>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={ingest} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} Capture</button></div>
    </Modal>
  );
}
