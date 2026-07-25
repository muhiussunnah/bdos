'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Plus, Shield, Check } from 'lucide-react';
import { NAV, NAV_GROUPS, BRAND } from '@/lib/constants';
import { useApp } from '@/components/providers/AppProvider';
import { Icon } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/utils';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const { projects, project, setProjectId, isAdmin, counts } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <>
      {open && <div className="fixed inset-0 z-[89] bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed lg:static z-[90] flex h-full w-[248px] flex-col overflow-hidden p-[18px_14px] text-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--sidebar)' }}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-2 pb-4 pt-1">
          <LogoMark size={34} />
          <div>
            <b className="block text-[15px] font-extrabold tracking-tight">{BRAND.name}</b>
            <span className="-mt-0.5 block text-[11px] text-white/40">{BRAND.full}</span>
          </div>
        </div>

        {/* project selector */}
        <div className="relative mx-1 mb-3.5">
          <button onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-[11px] border border-white/10 px-2.5 py-2.5 transition hover:bg-white/5"
            style={{ background: 'var(--sidebar-2)' }}>
            <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] text-[11px] font-extrabold text-white"
              style={{ background: project?.color || '#A435E8' }}>
              {(project?.name || 'P')[0].toUpperCase()}
            </span>
            <span className="flex-1 truncate text-left text-[13px] font-bold">{project?.name || 'Select project'}</span>
            <ChevronDown size={13} className="opacity-50" />
          </button>
          {menuOpen && (
            <div className="animate-pop absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-white/10 p-1.5 shadow-pop"
              style={{ background: '#1c1429' }}>
              {projects.map((p) => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-white/85 hover:bg-white/5">
                  <span className="grid h-4 w-4 place-items-center rounded text-[9px] font-bold" style={{ background: p.color }}>
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === project?.id && <Check size={13} className="text-accent" />}
                </button>
              ))}
              <Link href="/app/projects" onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center gap-2 border-t border-white/10 px-2.5 pt-2.5 text-[13px] font-semibold text-accent">
                <Plus size={13} /> New project
              </Link>
            </div>
          )}
        </div>

        {/* nav */}
        <nav className="flex flex-1 flex-col gap-px overflow-y-auto">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-[.13em] text-white/30">
                {NAV_GROUPS[g]}
              </div>
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = path === n.href || path.startsWith(n.href + '/');
                const badge = n.badgeKey === 'inbox' ? counts.inbox : n.badgeKey === 'tasks' ? counts.tasks : 0;
                return (
                  <Link key={n.href} href={n.href} onClick={onClose}
                    className={cn(
                      'relative flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition',
                      active ? 'bg-white/[.09] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )}>
                    {active && <span className="absolute -left-[14px] top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded"
                      style={{ background: 'linear-gradient(#A435E8,#E0457E)' }} />}
                    <Icon name={n.icon} className="opacity-90" />
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
              <div className="px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-[.13em] text-white/30">Admin</div>
              {[['/admin', 'Overview'], ['/admin/users', 'Users'], ['/admin/projects', 'Projects']].map(([href, label]) => {
                const active = path === href;
                return (
                  <Link key={href} href={href} onClick={onClose}
                    className={cn(
                      'relative flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition',
                      active ? 'bg-white/[.09] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )}>
                    <Shield size={17} className="opacity-90" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* agent status */}
        <div className="mt-auto border-t border-white/10 px-2.5 pb-0.5 pt-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5 text-[12px] text-white/60">
            <span className="animate-pulse2 h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} />
            Sales agent · {project?.name || 'idle'}
          </div>
        </div>
      </aside>
    </>
  );
}
