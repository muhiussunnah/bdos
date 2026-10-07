'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Building2, Search, Mail, Phone, Globe } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, StageTag, PriorityTag, Thinking } from '@/components/ui';
import { usePager, Pagination } from '@/components/listing';
import { ThreeDot } from '@/components/Menu';
import { useLeadLog } from '@/components/sales/CallFlow';
import { DateRangeSelect, ExportButton, useDateFilter } from '@/components/DateRange';
import { rangeBounds, inRange, rangeLabel } from '@/lib/threads';
import { exportLeads } from '@/lib/export';
import type { Lead } from '@/lib/types';

export default function CompaniesPage() {
  const { project, supabase } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [range, setRange] = useDateFilter('companies');
  const bounds = useMemo(() => rangeBounds(range), [range]);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('project_id', project.id).order('company_name');
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);
  const log = useLeadLog(load);

  const filtered = useMemo(() => leads.filter((l) =>
    inRange(l.created_at, bounds) &&
    (!q || `${l.company_name} ${l.contact_name} ${l.email} ${l.phone || ''} ${l.industry} ${l.location}`.toLowerCase().includes(q.toLowerCase()))), [leads, q, bounds]);
  const pager = usePager(filtered, 'companies', 50);
  useEffect(() => { pager.reset(); }, [q, range]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5 py-2">
          <Search size={15} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies, contacts, emails, phones…" className="w-full bg-transparent text-[13px] outline-none text-ink" />
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
        <ExportButton count={filtered.length} noun="companies" onClick={() => exportLeads(filtered, 'companies', project.name, rangeLabel(range))} />
      </div>

      {loading ? <Thinking label="Loading companies…" /> : filtered.length === 0 ? (
        <Card><EmptyState icon={<Building2 size={38} />} title={q || range.key !== 'all' ? 'No companies match' : 'No companies yet'} sub={q || range.key !== 'all' ? 'Try another search or a wider date range.' : 'Every lead you discover becomes a contact record here.'} /></Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>{['Company', 'Contact', 'Phone', 'Email', 'Priority', 'Stage', 'Added', ''].map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {pager.slice.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="td">
                      <div className="flex items-center gap-1.5 font-bold text-ink">
                        <span className="truncate" title={l.company_name}>{l.company_name}</span>
                        {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="flex-none text-faint hover:text-accent" title={l.website}><Globe size={13} /></a>}
                      </div>
                      <div className="text-[11.5px] text-faint">{[l.industry, l.location].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="td"><div className="font-semibold text-ink">{l.contact_name || '—'}</div><div className="text-[11.5px] text-faint">{l.role}</div></td>
                    <td className="td whitespace-nowrap">
                      {l.phone ? (
                        <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} title="Call — opens your phone dialer" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink hover:text-accent hover:underline">
                          <Phone size={12} className="flex-none text-faint" /><span>{l.phone}</span>
                        </a>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="td whitespace-nowrap">
                      {l.email ? (
                        <a href={`mailto:${l.email}`} title={l.email} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink hover:text-accent hover:underline">
                          <Mail size={12} className="flex-none text-faint" /><span>{l.email}</span>
                        </a>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="td"><PriorityTag p={l.priority} /></td>
                    <td className="td"><StageTag stage={l.stage} /></td>
                    <td className="td whitespace-nowrap text-[12px] text-faint">{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="td !pl-0"><ThreeDot items={log.items(l)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pager.page} pages={pager.pages} pageSize={pager.pageSize} total={pager.total} onPage={pager.setPage} onPageSize={pager.setPageSize} noun="companies" />
        </Card>
      )}
      {log.modals}
    </div>
  );
}
