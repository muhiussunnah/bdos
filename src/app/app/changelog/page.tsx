'use client';

import { CHANGELOG, CURRENT_VERSION, type ChangeEntry } from '@/lib/changelog';
import { Sparkles, Wrench, Bug, Server } from 'lucide-react';

const TAG: Record<ChangeEntry['tag'], { label: string; icon: typeof Sparkles; bg: string; fg: string }> = {
  feature: { label: 'New', icon: Sparkles, bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  improvement: { label: 'Improved', icon: Wrench, bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  fix: { label: 'Fix', icon: Bug, bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  infra: { label: 'Infra', icon: Server, bg: 'var(--green-soft)', fg: 'var(--green)' },
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}><Sparkles size={20} /></span>
          <div>
            <div className="text-[17px] font-extrabold tracking-tight text-ink">What&rsquo;s new</div>
            <div className="text-[13px] text-dim">You&rsquo;re on <span className="mono font-bold text-ink">v{CURRENT_VERSION}</span> · every update we ship, newest first.</div>
          </div>
        </div>
      </div>

      <div className="relative ml-3 border-l-2 border-line pl-6">
        {CHANGELOG.map((e, i) => {
          const t = TAG[e.tag]; const Ico = t.icon;
          return (
            <div key={e.version} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[31px] top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--bg)]" style={{ background: t.bg, color: t.fg }}><Ico size={12} /></span>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="mono rounded-lg px-2 py-0.5 text-[12.5px] font-extrabold" style={{ background: i === 0 ? 'var(--accent)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--dim)' }}>v{e.version}</span>
                <span className="tag" style={{ background: t.bg, color: t.fg }}>{t.label}</span>
                <span className="text-[12px] text-faint">{new Date(e.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <h3 className="mt-2 text-[15px] font-extrabold tracking-tight text-ink">{e.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {e.notes.map((n, j) => (
                  <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-dim"><span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-accent" />{n}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
