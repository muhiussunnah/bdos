'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, Search, Download, Mail, Phone, Globe } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, StageTag, PriorityTag, Thinking } from '@/components/ui';
import type { Lead } from '@/lib/types';

export default function CompaniesPage() {
  const { project, supabase } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('project_id', project.id).order('company_name');
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter((l) => !q || `${l.company_name} ${l.contact_name} ${l.email} ${l.industry} ${l.location}`.toLowerCase().includes(q.toLowerCase()));

  function exportCsv() {
    const head = ['Company', 'Website', 'Industry', 'Location', 'Contact', 'Role', 'Email', 'Phone', 'Priority', 'Stage'];
    const rows = filtered.map((l) => [l.company_name, l.website, l.industry, l.location, l.contact_name, l.role, l.email, l.phone, l.priority, l.stage].map((v) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [head.join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${project?.name || 'companies'}.csv`; a.click();
  }

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5 py-2">
          <Search size={15} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies, contacts, emails…" className="w-full bg-transparent text-[13px] outline-none text-ink" />
        </div>
        <button onClick={exportCsv} className="btn btn-ghost"><Download size={15} /> Export CSV</button>
      </div>

      {loading ? <Thinking label="Loading companies…" /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<Building2 size={38} />} title="No companies yet" sub="Every lead you discover becomes a contact record here." /></Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>{['Company', 'Contact', 'Reach', 'Priority', 'Stage'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="td"><div className="font-bold text-ink">{l.company_name}</div><div className="text-[11.5px] text-faint">{[l.industry, l.location].filter(Boolean).join(' · ')}</div></td>
                    <td className="td"><div className="font-semibold text-ink">{l.contact_name || '—'}</div><div className="text-[11.5px] text-faint">{l.role}</div></td>
                    <td className="td"><div className="flex gap-2 text-faint">
                      {l.email && <a href={`mailto:${l.email}`} className="hover:text-accent" title={l.email}><Mail size={15} /></a>}
                      {l.phone && <a href={`tel:${l.phone}`} className="hover:text-accent" title={l.phone}><Phone size={15} /></a>}
                      {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="hover:text-accent"><Globe size={15} /></a>}
                    </div></td>
                    <td className="td"><PriorityTag p={l.priority} /></td>
                    <td className="td"><StageTag stage={l.stage} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
