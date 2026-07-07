'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Ban, CheckCircle2, Search } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Thinking } from '@/components/ui';
import { relTime, initials } from '@/lib/utils';

interface AdminUser {
  id: string; email: string; full_name: string; is_admin: boolean; plan: string;
  blocked: boolean; created_at: string; projects: number; leads: number; sent: number;
}

export default function AdminUsersPage() {
  const { supabase, user: me } = useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) toast.error(error.message);
    setUsers((data as AdminUser[]) || []);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function set(target: string, patch: { p_blocked?: boolean; p_is_admin?: boolean; p_plan?: string }) {
    const { error } = await supabase.rpc('admin_set_user', { target, ...patch });
    if (error) return toast.error(error.message);
    toast.success('Updated'); load();
  }

  const filtered = users.filter((u) => !q || `${u.email} ${u.full_name}`.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <Thinking label="Loading users…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5 py-2">
        <Search size={15} className="text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="w-full bg-transparent text-[13px] outline-none text-ink" />
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{['User', 'Plan', 'Projects', 'Leads', 'Sent', 'Joined', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[11px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{initials(u.full_name || u.email)}</span>
                      <div><div className="flex items-center gap-1.5 font-bold text-ink">{u.full_name || '—'} {u.is_admin && <ShieldCheck size={13} className="text-accent" />}</div>
                        <div className="text-[11.5px] text-faint">{u.email}</div></div>
                    </div>
                  </td>
                  <td className="td">
                    <select value={u.plan} onChange={(e) => set(u.id, { p_plan: e.target.value })} className="rounded-lg border border-line bg-surface px-2 py-1 text-[12px] font-semibold text-ink">
                      {['trial', 'starter', 'pro', 'business'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="td mono">{u.projects}</td>
                  <td className="td mono">{u.leads}</td>
                  <td className="td mono">{u.sent}</td>
                  <td className="td text-dim">{relTime(u.created_at)}</td>
                  <td className="td">
                    {u.id !== me.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => set(u.id, { p_blocked: !u.blocked })} className={`btn btn-sm ${u.blocked ? 'btn-accent' : 'btn-ghost'} !px-2.5`} title={u.blocked ? 'Unblock' : 'Block'}>
                          {u.blocked ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                        </button>
                        <button onClick={() => set(u.id, { p_is_admin: !u.is_admin })} className={`btn btn-sm ${u.is_admin ? 'btn-accent' : 'btn-ghost'} !px-2.5`} title="Toggle admin">
                          <ShieldCheck size={13} />
                        </button>
                      </div>
                    ) : <span className="text-[11.5px] text-faint">you</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
