'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, FolderKanban, Send, CheckCircle2, Mail, Database, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Metric, Thinking } from '@/components/ui';

interface Overview { users: number; projects: number; leads: number; messages: number; sent: number; positive: number }

export default function AdminOverviewPage() {
  const { supabase } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.rpc('admin_overview').then(({ data, error }) => {
      if (error) setError(error.message);
      else setData(data as Overview);
    });
  }, [supabase]);

  if (error) return <Card><p className="text-[13px] text-bad">Admin RPC error: {error}. Make sure you ran <span className="mono">supabase/schema.sql</span> and your account has <span className="mono">is_admin = true</span>.</p></Card>;
  if (!data) return <Thinking label="Loading platform stats…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-[var(--accent-soft)] px-4 py-3 text-[13px] font-semibold text-accent">
        <ShieldCheck size={16} /> Super-admin console — platform-wide, across every workspace.
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Users" value={data.users} icon={<Users size={13} />} />
        <Metric label="Projects" value={data.projects} icon={<FolderKanban size={13} />} />
        <Metric label="Leads" value={data.leads} icon={<Database size={13} />} />
        <Metric label="Messages" value={data.messages} icon={<Mail size={13} />} />
        <Metric label="Emails sent" value={data.sent} icon={<Send size={13} />} />
        <Metric label="Positive leads" value={data.positive} icon={<CheckCircle2 size={13} />} tone="up" />
      </div>

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
