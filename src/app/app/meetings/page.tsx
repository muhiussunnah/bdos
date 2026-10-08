'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarDays, CalendarCheck, CalendarPlus, Video, Copy, ExternalLink, Link2, Settings2, Users, Clock, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, EmptyState, Thinking, Avatar } from '@/components/ui';
import { Hero } from '@/components/Hero';
import { LeadDrawer } from '@/components/LeadDrawer';
import { useLeadLog } from '@/components/sales/CallFlow';
import { sendersFrom } from '@/lib/email/resend';
import { meetingFor, meetingOf, isUpcoming, googleCalendarUrl, providerOf, PROVIDER_LABEL, RSVP_LABEL } from '@/lib/meetings';
import type { Lead, LeadMeeting } from '@/lib/types';

type Row = { lead: Lead; m: LeadMeeting };
type View = 'upcoming' | 'past' | 'cancelled';

const RSVP_ICON = { accepted: <CheckCircle2 size={12} />, declined: <XCircle size={12} />, tentative: <HelpCircle size={12} /> };
const RSVP_COLOR = { accepted: 'var(--green)', declined: 'var(--red)', tentative: 'var(--amber)' };

export default function MeetingsPage() {
  const { project, supabase, settings } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('upcoming');
  const [drawer, setDrawer] = useState<Lead | null>(null);
  const senders = useMemo(() => sendersFrom(settings), [settings]);
  const cfg = meetingFor(settings?.data, senders, null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('project_id', project.id).limit(5000);
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [project, supabase]);
  useEffect(() => { load(); }, [load]);
  const log = useLeadLog(load);

  const rows = useMemo(() => leads.map((lead) => ({ lead, m: meetingOf(lead) })).filter((r): r is Row => !!r.m), [leads]);
  const now = Date.now();
  const lists: Record<View, Row[]> = {
    upcoming: rows.filter((r) => isUpcoming(r.m, now)).sort((a, b) => a.m.at.localeCompare(b.m.at)),
    past: rows.filter((r) => r.m.status === 'scheduled' && !isUpcoming(r.m, now)).sort((a, b) => b.m.at.localeCompare(a.m.at)),
    cancelled: rows.filter((r) => r.m.status === 'cancelled').sort((a, b) => b.m.at.localeCompare(a.m.at)),
  };
  const today = lists.upcoming.filter((r) => new Date(r.m.at).toDateString() === new Date().toDateString()).length;
  const thisWeek = lists.upcoming.filter((r) => new Date(r.m.at).getTime() - now < 7 * 86400000).length;
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!project) return <Thinking label="Loading…" />;

  return (
    <div className="space-y-4">
      <Hero>
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#DB2777,#A435E8)' }}><CalendarDays size={20} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[18px] font-extrabold">{today ? `${today} meeting${today === 1 ? '' : 's'} today` : lists.upcoming.length ? `${lists.upcoming.length} upcoming meeting${lists.upcoming.length === 1 ? '' : 's'}` : 'No meetings booked yet'}</div>
            <div className="hero-dim text-[13px]">{thisWeek} this week · book from any lead card (📅) or send your booking link and let them pick a time.</div>
          </div>
          {cfg.bookingUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { navigator.clipboard.writeText(cfg.bookingUrl); toast.success('Booking link copied'); }} className="btn hero-ghost"><Copy size={15} /> Copy booking link</button>
              <a href={cfg.bookingUrl} target="_blank" rel="noreferrer" className="btn hero-ghost"><ExternalLink size={15} /> Booking page</a>
            </div>
          ) : (
            <Link href="/app/settings?tab=meetings" className="btn btn-accent"><Settings2 size={15} /> Set up booking link & Teams room</Link>
          )}
        </div>
      </Hero>

      {!cfg.roomUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-[12.5px] text-dim">
          <Video size={15} className="text-accent" /> Add your permanent Teams room link once and every invite gets a Join button.
          <Link href="/app/settings?tab=meetings" className="ml-auto font-bold text-accent hover:underline">Settings → Meetings</Link>
        </div>
      )}

      <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
        {(['upcoming', 'past', 'cancelled'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold capitalize transition ${view === v ? 'bg-ink text-bg' : 'text-dim'}`}>
            {v} <span className="ml-1 text-[11px] opacity-70">{lists[v].length}</span>
          </button>
        ))}
      </div>

      {loading ? <Thinking label="Loading meetings…" /> : lists[view].length === 0 ? (
        <Card><EmptyState icon={<CalendarDays size={38} />} title={view === 'upcoming' ? 'Nothing on the calendar' : `No ${view} meetings`}
          sub={view === 'upcoming' ? 'Open a lead and press 📅 Book meeting, or choose “Meeting booked” after a call. Invites go out with your Teams link.' : undefined} /></Card>
      ) : (
        <Card className="!p-0">
          {lists[view].map(({ lead, m }, i) => {
            const isToday = new Date(m.at).toDateString() === new Date().toDateString();
            return (
              <div key={lead.id} className="reveal flex flex-wrap items-center gap-4 border-t border-line p-4 first:border-t-0 hover:bg-surface-2" style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, boxShadow: `inset 4px 0 0 ${m.status === 'cancelled' ? 'var(--red)' : isToday ? '#DB2777' : 'transparent'}` }}>
                <div className="w-16 flex-none rounded-xl border border-line bg-surface py-1.5 text-center">
                  <div className="text-[10.5px] font-bold uppercase" style={{ color: '#DB2777' }}>{new Date(m.at).toLocaleDateString('en-GB', { month: 'short' })}</div>
                  <div className="text-[22px] font-black leading-none text-ink">{new Date(m.at).getDate()}</div>
                  <div className="text-[10.5px] text-faint">{new Date(m.at).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                </div>
                <button onClick={() => setDrawer(lead)} className="flex min-w-[220px] flex-1 items-center gap-3 text-left">
                  <Avatar name={lead.company_name} size={36} />
                  <div className="min-w-0">
                    <div className={`truncate font-bold text-ink ${m.status === 'cancelled' ? 'line-through opacity-70' : ''}`}>{m.title}</div>
                    <div className="truncate text-[12.5px] text-dim">{lead.company_name}{lead.contact_name ? ` · 👤 ${lead.contact_name}` : ''}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-faint">
                      <span className="inline-flex items-center gap-1"><Clock size={11} /> {fmtDay(m.at)} · {fmtTime(m.at)}–{fmtTime(m.end)}</span>
                      <span className="inline-flex items-center gap-1"><Users size={11} /> {m.attendees.join(', ') || 'no invite sent'}</span>
                      {m.rsvp && <span className="inline-flex items-center gap-1 font-bold" style={{ color: RSVP_COLOR[m.rsvp] }}>{RSVP_ICON[m.rsvp]} {RSVP_LABEL[m.rsvp]}</span>}
                      {!m.rsvp && m.invited && m.status === 'scheduled' && <span>awaiting reply</span>}
                    </div>
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.link && m.status === 'scheduled' && <a href={m.link} target="_blank" rel="noreferrer" className="btn btn-sm text-white" style={{ background: '#5B5FC7' }}><Video size={13} /> Join {PROVIDER_LABEL[providerOf(m.link)]}</a>}
                  {m.status === 'scheduled' && <a href={googleCalendarUrl(m)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Add to Google Calendar"><CalendarPlus size={13} /> Google Calendar</a>}
                  <button onClick={() => log.openBook(lead)} className="btn btn-ghost btn-sm">{m.status === 'scheduled' ? <><CalendarCheck size={13} /> Reschedule</> : <><CalendarPlus size={13} /> Book again</>}</button>
                  {view === 'cancelled' && <button onClick={() => log.sendBookingLink(lead)} className="btn btn-ghost btn-sm"><Link2 size={13} /> Booking link</button>}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <LeadDrawer lead={drawer} onClose={() => setDrawer(null)} onChange={load} />
      {log.modals}
    </div>
  );
}
