'use client';

import { useEffect, useState, useCallback } from 'react';
import { Send, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Metric, Thinking } from '@/components/ui';
import { relTime } from '@/lib/utils';
import type { Message, Lead } from '@/lib/types';

export default function OutreachPage() {
  const { project, supabase } = useApp();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('project_id', project.id).eq('direction', 'outbound').order('created_at', { ascending: false }).limit(200);
    const list = (data as Message[]) || [];
    setMsgs(list);
    const ids = [...new Set(list.map((m) => m.lead_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: ld } = await supabase.from('leads').select('id,company_name').in('id', ids);
      const map: Record<string, Lead> = {};
      (ld as Lead[] || []).forEach((l) => (map[l.id] = l));
      setLeads(map);
    }
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);

  if (!project) return <Thinking label="Loading…" />;

  const sent = msgs.filter((m) => m.status === 'sent').length;
  const failed = msgs.filter((m) => m.status === 'failed').length;
  const drafts = msgs.filter((m) => m.status === 'draft').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Metric label="Sent" value={sent} icon={<Send size={13} />} />
        <Metric label="Drafts" value={drafts} icon={<Clock size={13} />} />
        <Metric label="Failed" value={failed} icon={<XCircle size={13} />} tone={failed ? 'down' : undefined} />
      </div>

      {loading ? <Thinking label="Loading outreach…" /> : msgs.length === 0 ? (
        <Card><EmptyState icon={<Send size={38} />} title="No outreach sent yet" sub="Open a lead and let the agent write the first email." /></Card>
      ) : (
        <Card className="!p-0">
          {msgs.map((m) => (
            <div key={m.id} className="border-t border-line first:border-t-0">
              <button onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{
                  background: m.status === 'sent' ? 'var(--green-soft)' : m.status === 'failed' ? 'var(--red-soft)' : 'var(--amber-soft)',
                  color: m.status === 'sent' ? 'var(--green)' : m.status === 'failed' ? 'var(--red)' : 'var(--amber)',
                }}>{m.status === 'sent' ? <CheckCircle2 size={15} /> : m.status === 'failed' ? <XCircle size={15} /> : <Clock size={15} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink">{m.subject || '(no subject)'}</div>
                  <div className="text-[12px] text-dim">{m.lead_id ? leads[m.lead_id]?.company_name : m.to_email} · {m.to_email}</div>
                </div>
                <span className="text-[11.5px] text-faint">{relTime(m.sent_at || m.created_at)}</span>
                <ChevronDown size={15} className={`text-faint transition ${open === m.id ? 'rotate-180' : ''}`} />
              </button>
              {open === m.id && <div className="whitespace-pre-wrap border-t border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink">{m.body}</div>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
