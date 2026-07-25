'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Sparkles, Users, Send, Inbox, BarChart3, TrendingUp, CheckCircle2, CalendarCheck } from 'lucide-react';

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

function useCountUp(target: number, run: boolean, ms = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return v;
}

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : Math.round(n).toString();
}

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Sparkles, label: 'Autopilot', live: true },
  { icon: Users, label: 'Leads', badge: '12' },
  { icon: Send, label: 'Outreach' },
  { icon: Inbox, label: 'Inbox', badge: '3' },
  { icon: BarChart3, label: 'Reports' },
];

const METRICS = [
  { label: 'In pipeline', value: 106, delta: '+12 today', spark: [8, 12, 10, 16, 14, 20, 24] },
  { label: 'Positive', value: 11, delta: '+4', spark: [1, 2, 2, 4, 5, 8, 11] },
  { label: 'Meetings', value: 6, delta: '+2', spark: [0, 1, 1, 2, 3, 4, 6] },
  { label: 'Emails sent', value: 3142, big: '3.1K', delta: '+284', spark: [200, 900, 1400, 1900, 2400, 2800, 3142] },
];

const STAGES = [['New', 42], ['Contacted', 28], ['Follow-up', 19], ['Positive', 11], ['Meeting', 6]] as const;

function Sparkline({ data, color = '#A435E8' }: { data: number[]; color?: string }) {
  const w = 64, h = 20, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function MetricCard({ m, run }: { m: (typeof METRICS)[number]; run: boolean }) {
  const v = useCountUp(m.value, run);
  return (
    <div className="rounded-xl border border-[#ECEAF1] bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-semibold text-[#6A6478]">{m.label}</div>
        <span className="rounded-md px-1 py-px text-[9px] font-bold text-[#16A34A]" style={{ background: 'rgba(22,163,74,.1)' }}>{m.delta}</span>
      </div>
      <div className="mt-1 flex items-end justify-between">
        <div className="text-[20px] font-black leading-none text-[#16121F]" style={{ fontFamily: 'var(--font-mono)' }}>
          {m.big ? (run ? (v / 1000).toFixed(1) + 'K' : '0') : fmt(v)}
        </div>
        <Sparkline data={m.spark} />
      </div>
    </div>
  );
}

function AreaChart({ run }: { run: boolean }) {
  const w = 300, h = 76, pad = 4;
  const data = [12, 18, 15, 26, 22, 34, 30, 44, 52, 48, 66, 78];
  const max = Math.max(...data);
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (d / max) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  const len = 520;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 76 }}>
      <defs>
        <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A435E8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#A435E8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#heroArea)" opacity={run ? 1 : 0} style={{ transition: 'opacity .8s ease .4s' }} />
      <path d={line} fill="none" stroke="url(#heroLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={len} strokeDashoffset={run ? 0 : len} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }} />
      <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#A435E8" /><stop offset="1" stopColor="#E0457E" /></linearGradient>
    </svg>
  );
}

export function HeroDashboard() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const maxStage = 42;
  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_50px_140px_rgba(0,0,0,.6)]">
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-[#ECEAF1] bg-[#FBFAFD] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E5484D]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E08C1F]" /><span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
        <span className="ml-3 text-[11px] font-semibold text-[#9C97A8]">app.klientic.com — Dashboard</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[rgba(22,163,74,.1)] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
          <span className="anim-pulse2 h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Agent live
        </span>
      </div>

      <div className="grid grid-cols-[64px_1fr] text-left sm:grid-cols-[168px_1fr]">
        {/* sidebar */}
        <div className="flex flex-col gap-0.5 p-2.5" style={{ background: '#0E0916' }}>
          <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)' }}>
              <svg width="15" height="15" viewBox="0 0 100 100" fill="none"><path d="M30 20 V80" stroke="#fff" strokeWidth="12.5" strokeLinecap="round" /><path d="M39 52 L64 80" stroke="#fff" strokeWidth="12.5" strokeLinecap="round" /><path d="M39 52 L78 24" stroke="#fff" strokeWidth="12.5" strokeLinecap="round" /><path d="M60 24 L78 24 L78 42" stroke="#fff" strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="hidden text-[13px] font-black text-white sm:block">Klientic</span>
          </div>
          {NAV.map((n) => (
            <div key={n.label} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold ${n.active ? 'bg-white/10 text-white' : 'text-white/55'}`}>
              <n.icon size={14} className="flex-none" />
              <span className="hidden sm:block">{n.label}</span>
              {n.live && <span className="anim-pulse2 ml-auto hidden h-1.5 w-1.5 rounded-full bg-[#16A34A] sm:block" />}
              {n.badge && <span className="ml-auto hidden rounded-full px-1.5 text-[9px] font-black text-white sm:block" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{n.badge}</span>}
            </div>
          ))}
        </div>

        {/* main */}
        <div className="p-3.5 sm:p-4">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {METRICS.map((m) => <MetricCard key={m.label} m={m} run={seen} />)}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {/* pipeline */}
            <div className="rounded-xl border border-[#ECEAF1] bg-white p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="text-[11.5px] font-bold text-[#16121F]">Lead pipeline</div>
                <span className="text-[10px] text-[#9C97A8]">106 leads</span>
              </div>
              <div className="space-y-2">
                {STAGES.map(([name, n], i) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-14 flex-none text-[9.5px] font-semibold text-[#6A6478]">{name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1EFF5]">
                      <div className="h-full rounded-full" style={{ width: seen ? `${(n / maxStage) * 100}%` : '0%', background: 'linear-gradient(90deg,#A435E8,#E0457E)', transition: `width 1s cubic-bezier(.3,.7,.3,1) ${i * 0.1}s` }} />
                    </div>
                    <span className="mono w-4 flex-none text-right text-[10px] font-bold text-[#16121F]">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* performance */}
            <div className="rounded-xl border border-[#ECEAF1] bg-white p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[11.5px] font-bold text-[#16121F]">Replies this week</div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#16A34A]"><TrendingUp size={11} /> +38%</span>
              </div>
              <AreaChart run={seen} />
              <div className="mt-2 flex gap-3 text-[9.5px]">
                <span className="flex items-center gap-1 text-[#6A6478]"><CheckCircle2 size={11} className="text-[#16A34A]" /> 24 positive</span>
                <span className="flex items-center gap-1 text-[#6A6478]"><CalendarCheck size={11} className="text-[#2563EB]" /> 6 booked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
