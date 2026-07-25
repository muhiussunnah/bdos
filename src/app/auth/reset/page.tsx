'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Lock, Loader2, Check, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LogoMark } from '@/components/Logo';
import { BRAND } from '@/lib/constants';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? 'ready' : 'invalid');
    });
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Password updated — you are signed in.');
    router.push('/app/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark size={40} />
          <div className="text-[15px] font-extrabold text-ink">{BRAND.name}</div>
        </div>

        {status === 'checking' && (
          <div className="flex items-center gap-2.5 text-[14px] text-dim"><Loader2 size={16} className="animate-spin text-accent" /> Verifying your link…</div>
        )}

        {status === 'invalid' && (
          <>
            <h2 className="text-2xl font-black tracking-tight text-ink">Link expired</h2>
            <p className="mt-2 text-sm text-dim">This password reset link is invalid or has already been used. Request a fresh one from the sign-in page.</p>
            <Link href="/login" className="btn btn-accent mt-6 w-full justify-center">Back to sign in <ArrowRight size={16} /></Link>
          </>
        )}

        {status === 'ready' && (
          <>
            <h2 className="text-2xl font-black tracking-tight text-ink">Set a new password</h2>
            <p className="mt-1 text-sm text-dim">Choose a strong password for your account.</p>
            <form onSubmit={save} className="mt-6 space-y-3">
              <div className="field !mb-0">
                <label>New password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                  <input className="input !pl-10" type="password" required minLength={6} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoFocus />
                </div>
              </div>
              <button className="btn btn-accent w-full justify-center !py-3" disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Update password</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
