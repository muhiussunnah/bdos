'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Plus, Shield, Check } from 'lucide-react';
import { NAV, NAV_GROUPS, BRAND } from '@/lib/constants';
import { CURRENT_VERSION } from '@/lib/changelog';
import { useApp } from '@/components/providers/AppProvider';
import { Icon } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * App sidebar. Colours come from the --sb-* variables in globals.css, so it is
 * white/lavender in light mode and deep plum in dark mode without any JS.
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const { projects, project, setProjectId, isAdmin, counts } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  const item = 'sb-item relative flex items-center gap-[11px] px-3 py-2.5 text-[13.5px] font-semibold';

  return (
    <>
      {open && <div className="fixed inset-0 z-[89] bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'sb fixed lg:static z-[90] flex h-full w-[248px] flex-col overflow-hidden p-[18px_14px] transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}>
        {/* brand */}
        <div className="flex items-center gap-3 px-2 pb-4 pt-1">
          <LogoMark size={34} />
          <div>
            <b className="block text-[15px] font-extrabold tracking-tight">{BRAND.name}</b>
            <span className="sb-sub -mt-0.5 block text-[11px]">{BRAND.full}</span>
          </div>
        </div>

        {/* project selector */}
        <div className="relative mx-1 mb-3.5">
          <button onClick={() => setMenuOpen((v) => !v)} className="sb-proj flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2.5">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] text-[11px] font-extrabold text-white"
              style={{ background: project?.color || '#A435E8' }}>
              {(project?.name || 'P')[0].toUpperCase()}
            </span>
            <span className="flex-1 truncate text-left text-[13px] font-bold">{project?.name || 'Select project'}</span>
            <ChevronDown size={13} className="opacity-50" />
          </button>
          {menuOpen && (
            <div className="sb-menu animate-pop absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl p-1.5 shadow-pop">
              {projects.map((p) => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setMenuOpen(false); }}
                  className="sb-menu-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold">
                  <span className="grid h-4 w-4 place-items-center rounded text-[9px] font-bold text-white" style={{ background: p.color }}>
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === project?.id && <Check size={13} className="text-accent" />}
                </button>
              ))}
              <Link href="/app/projects" onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center gap-2 px-2.5 pt-2.5 text-[13px] font-semibold text-accent" style={{ borderTop: '1px solid var(--sidebar-line)' }}>
                <Plus size={13} /> New project
              </Link>
            </div>
          )}
        </div>

        {/* nav */}
        <nav className="flex flex-1 flex-col gap-px overflow-y-auto">
          {groups.map((g) => (
            <div key={g}>
              <div className="sb-group px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-[.13em]">
                {NAV_GROUPS[g]}
              </div>
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = path === n.href || path.startsWith(n.href + '/');
                const badge = n.badgeKey === 'inbox' ? counts.inbox : n.badgeKey === 'tasks' ? counts.tasks : n.badgeKey === 'followups' ? counts.followups : 0;
                return (
                  <Link key={n.href} href={n.href} onClick={onClose} className={cn(item, active && 'is-active')} aria-current={active ? 'page' : undefined}>
                    {active && <span className="absolute -left-[14px] top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded"
                      style={{ background: 'linear-gradient(#A435E8,#E0457E)' }} />}
                    <Icon name={n.icon} className="sb-ico opacity-90" />
                    <span>{n.label}</span>
                    {badge > 0 && (
                      <span className="mono ml-auto rounded-full bg-accent px-[7px] py-px text-[10px] font-extrabold text-white">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {isAdmin && (
            <div>
              <div className="sb-group px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-[.13em]">Admin</div>
              {[['/admin', 'Overview'], ['/admin/users', 'Users'], ['/admin/projects', 'Projects']].map(([href, label]) => {
                const active = path === href;
                return (
                  <Link key={href} href={href} onClick={onClose} className={cn(item, active && 'is-active')} aria-current={active ? 'page' : undefined}>
                    <Shield size={17} className="sb-ico opacity-90" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* agent status + version */}
        <div className="sb-foot mt-auto px-2.5 pb-0.5 pt-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5 text-[12px]">
            <span className="animate-pulse2 h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} />
            Sales agent · {project?.name || 'idle'}
          </div>
          <Link href="/app/changelog" onClick={onClose}
            className="sb-ver mono flex items-center justify-between rounded-lg px-1 py-1 text-[11px] font-bold transition">
            <span>v{CURRENT_VERSION}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide">What&rsquo;s new</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
