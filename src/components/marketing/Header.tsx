'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { MKT_NAV } from '@/lib/marketing';
import { Logo } from '@/components/Logo';
import { createClient, supabaseConfigured } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';

type Me = { name: string; email: string; avatar: string | null };

/**
 * Who is signed in (for the marketing chrome). Resolved client-side so the
 * marketing pages stay static/cached; renders the logged-out state until known.
 */
export function useViewer(): { me: Me | null; ready: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    const supabase = createClient();
    let alive = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { setMe(null); setReady(true); return; }
      const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
      if (!alive) return;
      const meta = (user.user_metadata || {}) as { full_name?: string; avatar_url?: string };
      setMe({
        name: profile?.full_name || meta.full_name || user.email?.split('@')[0] || 'Account',
        email: user.email || '',
        avatar: profile?.avatar_url || meta.avatar_url || null,
      });
      setReady(true);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return { me, ready };
}

function Avatar({ me, size = 28 }: { me: Me; size?: number }) {
  return me.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={me.avatar} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full text-[11px] font-extrabold text-white"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{initials(me.name)}</span>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { me } = useViewer();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  return (
    <header className="sticky top-0 z-50 border-b border-[#ECEAF1] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5">
        <Link href="/" aria-label="Klientic home" className="flex w-fit items-center"><Logo size={34} /></Link>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {MKT_NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-lg px-3.5 py-2 text-[14px] font-semibold transition ${isActive(n.href) ? 'bg-[#F4F3F7] text-[#16121F]' : 'text-[#6A6478] hover:bg-[#F4F3F7] hover:text-[#16121F]'}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          {me ? (
            <Link href="/app/dashboard" title={me.email}
              className="hidden items-center gap-2.5 rounded-full border border-[#ECEAF1] bg-white py-1.5 pl-1.5 pr-4 text-[14px] font-bold text-[#16121F] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:inline-flex">
              <Avatar me={me} /> Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-[11px] px-4 py-2 text-[14px] font-bold text-[#16121F] transition hover:bg-[#F4F3F7] md:inline-flex">Log in</Link>
              <Link href="/login" className="hidden items-center gap-1.5 rounded-[11px] px-4 py-2.5 text-[14px] font-bold text-white transition hover:-translate-y-0.5 md:inline-flex"
                style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 4px 14px rgba(164,53,232,.32)' }}>
                Start free <ArrowRight size={15} />
              </Link>
            </>
          )}
          <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#ECEAF1] text-[#16121F] md:hidden">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#ECEAF1] bg-white px-5 py-3 md:hidden">
          {MKT_NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-[15px] font-semibold ${isActive(n.href) ? 'bg-[#F4F3F7] text-[#16121F]' : 'text-[#16121F]'}`}>{n.label}</Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-[#ECEAF1] pt-3">
            {me ? (
              <Link href="/app/dashboard" onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 text-center text-[14px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>
                <Avatar me={me} size={22} /> <LayoutDashboard size={15} /> Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="flex-1 rounded-[11px] border border-[#ECEAF1] py-2.5 text-center text-[14px] font-bold text-[#16121F]">Log in</Link>
                <Link href="/login" className="flex-1 rounded-[11px] py-2.5 text-center text-[14px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>Start free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
