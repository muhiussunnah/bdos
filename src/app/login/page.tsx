'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { createClient, supabaseConfigured } from '@/lib/supabase/client';
import { BRAND } from '@/lib/constants';
import { LogoMark } from '@/components/Logo';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/app/dashboard';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error('Supabase is not configured yet. Add your keys to .env.local');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast.success('Account created. Check your inbox to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    if (!email) return toast.error('Enter your email first');
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
      });
      if (error) throw error;
      toast.success('Magic link sent — check your email.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send link');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* hero */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: 'radial-gradient(120% 120% at 0% 0%, #241636 0%, #0E0916 55%)' }}>
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">{BRAND.name}</div>
            <div className="text-[11px] text-white/45">{BRAND.full}</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
            <Sparkles size={13} className="text-[#E0457E]" /> AI research · outreach · follow-up
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight">
            Your autonomous<br />business-development<br /><span style={{ background: 'linear-gradient(135deg,#C77BFF,#FF8FB8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>operating system.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Find leads, qualify them, write human outreach, chase follow-ups and triage replies —
            on autopilot. Your team keeps the closing.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[['10+', 'sources / lead'], ['3·7·21', 'day follow-ups'], ['<60s', 'meeting prep']].map(([a, b]) => (
              <div key={b} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mono text-lg font-extrabold">{a}</div>
                <div className="text-[11px] text-white/45">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/35">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
        <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(164,53,232,.55),transparent 70%)' }} />
      </div>

      {/* form */}
      <div className="flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <LogoMark size={40} />
            <div className="text-[15px] font-extrabold">{BRAND.name}</div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-ink">
            {mode === 'signin' ? 'Welcome back' : 'Create your workspace'}
          </h2>
          <p className="mt-1 text-sm text-dim">
            {mode === 'signin' ? 'Sign in to your command center.' : 'Start hunting and closing in minutes.'}
          </p>

          {!supabaseConfigured && (
            <div className="mt-4 rounded-xl border border-warn/30 bg-[var(--amber-soft)] px-3 py-2 text-xs font-semibold text-warn">
              Supabase not connected. Add keys to <span className="mono">.env.local</span> and restart.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === 'signup' && (
              <div className="field !mb-0">
                <label>Full name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Albin Larsson" />
              </div>
            )}
            <div className="field !mb-0">
              <label>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input className="input !pl-10" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
            </div>
            <div className="field !mb-0">
              <label>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input className="input !pl-10" type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <button className="btn btn-accent w-full justify-center !py-3" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>{mode === 'signin' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></>}
            </button>
          </form>

          <button onClick={magicLink} disabled={busy}
            className="btn btn-ghost mt-3 w-full justify-center">Email me a magic link</button>

          <p className="mt-6 text-center text-sm text-dim">
            {mode === 'signin' ? "Don't have an account?" : 'Already have one?'}{' '}
            <button className="font-bold text-accent hover:underline"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
