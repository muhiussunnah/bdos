'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Share2, Copy, Users, Gift, Loader2, Check } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Metric, Thinking } from '@/components/ui';
import { BRAND } from '@/lib/constants';

export default function AffiliatePage() {
  const { user, supabase } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: rc }] = await Promise.all([
        supabase.from('profiles').select('ref_code').eq('id', user.id).maybeSingle(),
        supabase.rpc('my_referral_count'),
      ]);
      setCode(p?.ref_code || null);
      setReferrals((rc as number) || 0);
      setLoading(false);
    })();
  }, [supabase, user.id]);

  const link = code ? `https://${BRAND.domain}/?ref=${code}` : '';

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopied(false), 1600);
  }

  if (loading) return <Thinking label="Loading your affiliate dashboard…" />;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#241636,#0E0916)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/70"><Gift size={15} className="text-[#E0457E]" /> Referral program</div>
          <h2 className="mt-2 text-[22px] font-black tracking-tight">Earn 30% recurring for every client you bring</h2>
          <p className="mt-1.5 max-w-lg text-[13px] text-white/60">Share your link. When someone signs up and subscribes through it, you earn 30% of their plan — every month, for as long as they stay.</p>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full" style={{ background: 'radial-gradient(circle,rgba(164,53,232,.5),transparent 70%)' }} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Metric label="Your referrals" value={referrals} icon={<Users size={13} />} />
        <Metric label="Commission" value="30%" icon={<Gift size={13} />} />
        <Metric label="Referral code" value={code || '—'} icon={<Share2 size={13} />} />
      </div>

      <Card>
        <div className="card-h"><h3>Your referral link</h3></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={link} onClick={(e) => (e.target as HTMLInputElement).select()} className="input flex-1 !bg-surface-2 font-medium" />
          <button onClick={copy} className="btn btn-accent">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}</button>
        </div>
        <p className="hint">Anyone who signs up after clicking this link is attributed to you automatically.</p>
      </Card>

      <Card>
        <div className="card-h"><h3>How it works</h3></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Share your link', 'Post it, DM it, or add it to your newsletter and content.'],
            ['They sign up & subscribe', 'Your code is attached to their account the moment they join.'],
            ['You get paid monthly', '30% of their plan lands with you every billing cycle they stay.'],
          ].map(([t, d], i) => (
            <div key={t} className="rounded-xl border border-line bg-surface-2 p-4">
              <span className="mono text-[13px] font-black text-grad-ink">0{i + 1}</span>
              <div className="mt-1 font-bold text-ink">{t}</div>
              <p className="mt-1 text-[12.5px] text-dim">{d}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
