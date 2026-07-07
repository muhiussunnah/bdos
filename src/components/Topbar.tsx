'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, Sparkles, Sun, Moon, LogOut, Shield, User as UserIcon, ChevronDown } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { NAV } from '@/lib/constants';
import { initials } from '@/lib/utils';

const SUBTITLES: Record<string, string> = {
  '/app/dashboard': 'Real-time overview',
  '/app/autopilot': 'Autonomous research, outreach & replies',
  '/app/leads': 'Pipeline and prioritization',
  '/app/companies': 'Every contact in one place',
  '/app/outreach': 'AI-written, human-sounding email',
  '/app/inbox': 'Automatic reply classification',
  '/app/tasks': "The sales manager's daily call list",
  '/app/reports': 'Daily management report',
  '/app/knowledge': 'Everything the agent may use',
  '/app/projects': 'Many businesses, one system',
  '/app/settings': 'Providers, email & agent config',
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, settings, supabase, refreshSettings } = useApp();
  const [userMenu, setUserMenu] = useState(false);

  const nav = NAV.find((n) => path.startsWith(n.href));
  const title = path.startsWith('/admin') ? 'Admin' : nav?.label || 'BDOS';
  const subtitle = SUBTITLES[path] || (path.startsWith('/admin') ? 'Platform control' : '');
  const dark = (settings?.theme || 'light') === 'dark';

  async function toggleTheme() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    await supabase.from('user_settings').update({ theme: next }).eq('owner_id', user.id);
    refreshSettings();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3.5 border-b border-line px-4 py-3.5 md:px-[30px]"
      style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'saturate(160%) blur(14px)' }}>
      <button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-[9px] border border-line bg-surface lg:hidden">
        <Menu size={18} />
      </button>
      <div>
        <div className="text-[20px] font-extrabold tracking-tight text-ink">{title}</div>
        {subtitle && <div className="text-[12.5px] text-dim">{subtitle}</div>}
      </div>

      <div className="flex-1" />

      <div className="hidden items-center gap-2.5 rounded-[11px] border border-line bg-surface px-3.5 py-2 md:flex" style={{ width: 200 }}>
        <Search size={15} className="text-faint" />
        <input placeholder="Search…" className="w-full border-none bg-transparent text-[13px] outline-none text-ink" />
      </div>

      <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-surface text-dim hover:text-ink">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <Link href="/app/leads?discover=1" className="btn btn-accent">
        <Sparkles size={15} /> <span className="hidden sm:inline">Find leads</span>
      </Link>

      <div className="relative">
        <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-[11px] border border-line bg-surface py-1.5 pl-1.5 pr-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>
            {initials(profile?.full_name || user.email)}
          </span>
          <ChevronDown size={13} className="text-faint" />
        </button>
        {userMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
            <div className="animate-pop absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
              <div className="border-b border-line px-3 py-2">
                <div className="truncate text-[13px] font-bold text-ink">{profile?.full_name || 'You'}</div>
                <div className="truncate text-[11px] text-faint">{user.email}</div>
              </div>
              <Link href="/app/settings" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-dim hover:bg-surface-2 hover:text-ink">
                <UserIcon size={15} /> Settings
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-dim hover:bg-surface-2 hover:text-ink">
                  <Shield size={15} /> Admin console
                </Link>
              )}
              <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-bad hover:bg-[var(--red-soft)]">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
