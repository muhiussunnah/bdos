'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Thinking } from '@/components/ui';
import { relTime } from '@/lib/utils';

interface AdminProject { id: string; name: string; owner_email: string; leads: number; sent: number; created_at: string }

export default function AdminProjectsPage() {
  const { supabase } = useApp();
  const [rows, setRows] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('admin_list_projects').then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRows((data as AdminProject[]) || []);
      setLoading(false);
    });
  }, [supabase]);

  if (loading) return <Thinking label="Loading projects…" />;

  return (
    <Card className="!p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr>{['Project', 'Owner', 'Leads', 'Sent', 'Created'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="td font-bold text-ink">{p.name}</td>
                <td className="td text-dim">{p.owner_email}</td>
                <td className="td mono">{p.leads}</td>
                <td className="td mono">{p.sent}</td>
                <td className="td text-dim">{relTime(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
