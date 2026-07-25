'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, Check, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Thinking } from '@/components/ui';
import { initials } from '@/lib/utils';

export default function AccountPage() {
  const { user, supabase } = useApp();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [plan, setPlan] = useState('trial');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name, avatar_url, plan').eq('id', user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name || '');
      setAvatar(data?.avatar_url || null);
      setPlan(data?.plan || 'trial');
      setLoading(false);
    });
  }, [supabase, user.id]);

  async function uploadAvatar(file: File) {
    if (file.size > 3 * 1024 * 1024) return toast.error('Image must be under 3MB');
    setBusy('avatar');
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: e2 } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (e2) throw e2;
      setAvatar(url);
      toast.success('Profile photo updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed. Did you run the storage section of schema.sql?');
    } finally { setBusy(null); }
  }

  async function saveName() {
    setBusy('name');
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('Name updated');
  }

  async function changeEmail(email: string) {
    if (!email || email === user.email) return toast.error('Enter a new email');
    setBusy('email');
    const { error } = await supabase.auth.updateUser({ email });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('Confirmation sent to your new email. Click the link to confirm.');
  }

  async function changePassword(pw: string) {
    if (pw.length < 6) return toast.error('Password must be at least 6 characters');
    setBusy('password');
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('Password updated');
  }

  if (loading) return <Thinking label="Loading your account…" />;

  return (
    <div className="max-w-2xl space-y-4">
      {/* profile card */}
      <Card>
        <div className="card-h"><h3>Profile</h3><span className="stagetag capitalize">{plan} plan</span></div>
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="avatar" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl text-[24px] font-black text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{initials(name || user.email)}</div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={busy === 'avatar'}
              className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-ink text-bg">
              {busy === 'avatar' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-faint">Signed in as</div>
            <div className="font-bold text-ink">{user.email}</div>
            <p className="mt-1 text-[12px] text-faint">JPG or PNG, up to 3MB.</p>
          </div>
        </div>
        <div className="field mt-5 !mb-0">
          <label>Full name</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input className="input !pl-10" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button onClick={saveName} disabled={busy === 'name'} className="btn btn-accent">{busy === 'name' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
          </div>
        </div>
      </Card>

      {/* email */}
      <EmailCard current={user.email || ''} onSave={changeEmail} busy={busy === 'email'} />
      {/* password */}
      <PasswordCard onSave={changePassword} busy={busy === 'password'} />
    </div>
  );
}

function EmailCard({ current, onSave, busy }: { current: string; onSave: (e: string) => void; busy: boolean }) {
  const [email, setEmail] = useState(current);
  return (
    <Card>
      <div className="card-h"><h3>Email address</h3></div>
      <div className="field !mb-0"><label>Email</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input !pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button onClick={() => onSave(email)} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : 'Update'}</button>
        </div>
        <p className="hint">Changing your email sends a confirmation link to the new address.</p>
      </div>
    </Card>
  );
}

function PasswordCard({ onSave, busy }: { onSave: (p: string) => void; busy: boolean }) {
  const [pw, setPw] = useState('');
  return (
    <Card>
      <div className="card-h"><h3>Password</h3></div>
      <div className="field !mb-0"><label>New password</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input !pl-10" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
          </div>
          <button onClick={() => { onSave(pw); setPw(''); }} disabled={busy || pw.length < 6} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : 'Change'}</button>
        </div>
      </div>
    </Card>
  );
}
