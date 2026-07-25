'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Database, Send, CheckCircle2, RefreshCw, ShieldCheck, ArrowRight, FolderKanban } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Metric, Thinking } from '@/components/ui';
import { Donut, AreaChart } from '@/components/charts';
import { initials, relTime } from '@/lib/utils';

interface Overview {
  users: number; active_users: number; projects: number; leads: number;
  messages: number; sent: number; positive: number;
  by_priority: Record<string, number>; by_stage: Record<string, number>;
  signups: { d: string; c: number }[];
}
interface AUser {
  id: string; email: string; full_name: string; is_admin: boolean; plan: string;
  created_at: string; projects: number; leads: number; sent: number;
}

export default function AdminOverviewPage() {
  const { supabase } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: ov, error: e1 }, { data: us }] = await Promise.all([
      supabase.rpc('admin_overview'),
      supabase.rpc('admin_list_users'),
    ]);
    if (e1) setError(e1.message);
    else setData(ov as Overview);
    setUsers((us as AUser[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (error) return <Card><p className="text-[13px] text-bad">Admin RPC error: {error}. Run <span className="mono">supabase/schema.sql</span> and make sure your account has <span className="mono">is_admin = true</span>.</p></Card>;
  if (loading || !data) return <Thinking label="Loading platform stats…" />;

  const prio = data.by_priority || {};
  const donutSegs = [
    { label: 'Priority A', value: prio.A || 0, color: '#E5484D' },
    { label: 'Priority B', value: prio.B || 0, color: '#E08C1F' },
    { label: 'Priority C', value: prio.C || 0, color: '#2563EB' },
  ].filter((s) => s.value > 0);

  // cumulative signups
  const sorted = [...(data.signups || [])].sort((a, b) => a.d.localeCompare(b.d));
  let run = 0;
  const growth = sorted.map((s) => (run += s.c));
  if (growth.length === 1) growth.unshift(0);

  const top = [...users].sort((a, b) => b.leads - a.leads).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-[var(--accent-soft)] px-4 py-2.5 text-[13px] font-semibold text-accent">
          <ShieldCheck size={16} /> Super-admin console — platform-wide across every workspace.
        </div>
        <button onClick={load} className="btn btn-ghost"><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active users" value={data.active_users} icon={<Users size={13} />} delta={`${data.users} total`} />
        <Metric label="Total leads" value={data.leads.toLocaleString()} icon={<Database size={13} />} />
        <Metric label="Emails sent" value={data.sent.toLocaleString()} icon={<Send size={13} />} />
        <Metric label="Positive / won" value={data.positive.toLocaleString()} icon={<CheckCircle2 size={13} />} tone="up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="card-h"><h3>Lead mix</h3><span className="text-[12px] text-dim">by priority · all users</span></div>
          {donutSegs.length ? <Donut segments={donutSegs} centerTop={data.leads.toLocaleString()} centerBottom="leads" />
            : <p className="py-10 text-center text-[13px] text-faint">No leads yet across the platform.</p>}
        </Card>
        <Card>
          <div className="card-h"><h3>User growth</h3><span className="text-[12px] text-dim">cumulative signups</span></div>
          {growth.length > 1 ? <AreaChart values={growth} /> : <p className="py-10 text-center text-[13px] text-faint">Not enough signups to chart yet.</p>}
          <div className="mt-2 text-[12px] text-faint">{data.users} total users · {data.projects} projects</div>
        </Card>
      </div>

      <Card className="!p-0">
        <div className="flex items-center justify-between px-5 pt-5"><h3 className="text-[14.5px] font-extrabold">Top users by output</h3><Link href="/admin/users" className="text-[12px] font-bold text-accent hover:underline">Manage users →</Link></div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{['#', 'User', 'Leads', 'Sent', 'Projects', 'Plan', 'Joined'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {top.map((u, i) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="td mono font-bold text-faint">{i + 1}</td>
                  <td className="td"><div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[11px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{initials(u.full_name || u.email)}</span>
                    <div><div className="flex items-center gap-1.5 font-bold text-ink">{u.full_name || '—'}{u.is_admin && <ShieldCheck size={12} className="text-accent" />}</div><div className="text-[11.5px] text-faint">{u.email}</div></div>
                  </div></td>
                  <td className="td mono">{u.leads.toLocaleString()}</td>
                  <td className="td mono">{u.sent.toLocaleString()}</td>
                  <td className="td mono">{u.projects}</td>
                  <td className="td"><span className="stagetag capitalize">{u.plan}</span></td>
                  <td className="td text-dim">{relTime(u.created_at)}</td>
                </tr>
              ))}
              {top.length === 0 && <tr><td colSpan={7} className="td text-center text-faint">No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2" />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/users"><Card className="flex items-center gap-3 transition hover:border-accent">
          <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={18} /></span>
          <div className="flex-1"><div className="font-extrabold text-ink">Manage users</div><div className="text-[12.5px] text-dim">Block, grant admin, change plan</div></div>
          <ArrowRight size={16} className="text-faint" /></Card></Link>
        <Link href="/admin/projects"><Card className="flex items-center gap-3 transition hover:border-accent">
          <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><FolderKanban size={18} /></span>
          <div className="flex-1"><div className="font-extrabold text-ink">All projects</div><div className="text-[12.5px] text-dim">Every workspace &amp; its volume</div></div>
          <ArrowRight size={16} className="text-faint" /></Card></Link>
      </div>
    </div>
  );
}
