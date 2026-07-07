'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { BarChart3, Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Thinking } from '@/components/ui';
import type { Report } from '@/lib/types';

const METRIC_LABELS: Record<string, string> = {
  leads_total: 'Leads total', leads_today: 'New today', contacted: 'Contacted', emails_sent: 'Emails sent',
  replies: 'Replies', positive: 'Positive', meetings: 'Meetings', needs_action: 'Needs action',
};

export default function ReportsPage() {
  const { project, supabase } = useApp();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('reports').select('*').eq('project_id', project.id).order('report_date', { ascending: false }).limit(30);
    setReports((data as Report[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch('/api/reports/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Today's report is ready"); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-dim">A daily management snapshot — the numbers plus the agent&apos;s read on today&apos;s top opportunities.</p>
        <button onClick={generate} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Generate today&apos;s report</button>
      </div>

      {loading ? <Thinking label="Loading reports…" /> : reports.length === 0 ? (
        <Card><EmptyState icon={<BarChart3 size={38} />} title="No reports yet" sub="Generate your first daily report."
          action={<button onClick={generate} className="btn btn-accent"><Sparkles size={15} /> Generate report</button>} /></Card>
      ) : (
        reports.map((r, i) => (
          <Card key={r.id || r.report_date}>
            <div className="card-h"><h3>{new Date(r.report_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              {i === 0 && <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>latest</span>}</div>
            <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {Object.entries(r.metrics || {}).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="text-[11px] font-semibold text-dim">{METRIC_LABELS[k] || k}</div>
                  <div className="mono mt-0.5 text-[20px] font-extrabold text-ink">{v}</div>
                </div>
              ))}
            </div>
            {r.summary && <div className="aibox"><div className="aihead"><Sparkles size={13} /> Summary</div><p className="text-[13.5px] leading-relaxed text-ink">{r.summary}</p></div>}
            {r.top_opportunities?.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-faint"><TrendingUp size={13} /> Top opportunities</div>
                <div className="space-y-1.5">{r.top_opportunities.map((o, j) => (
                  <div key={j} className="flex gap-2.5 rounded-xl border border-line bg-surface p-2.5 text-[13px]">
                    <span className="mono flex-none font-bold text-accent">#{j + 1}</span>
                    <div><b className="text-ink">{o.company}</b> <span className="text-dim">— {o.reason}</span></div>
                  </div>
                ))}</div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
