'use client';

export interface Seg { label: string; value: number; color: string }

export function Donut({ segments, centerTop, centerBottom, size = 200, thickness = 22 }: {
  segments: Seg[]; centerTop: string | number; centerBottom?: string; size?: number; thickness?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
          {segments.map((s) => {
            const frac = s.value / total;
            const dash = frac * c;
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
                strokeLinecap="butt" style={{ transition: 'stroke-dasharray .8s ease' }} />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="mono" style={{ fontSize: size * 0.18, fontWeight: 800, fill: 'var(--text)' }}>{centerTop}</text>
        {centerBottom && <text x="50%" y="62%" textAnchor="middle" style={{ fontSize: 11, letterSpacing: '.08em', fill: 'var(--faint)', fontWeight: 700 }}>{centerBottom.toUpperCase()}</text>}
      </svg>
      <div className="flex-1 space-y-2.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: s.color }} />
            <span className="text-dim">{s.label}</span>
            <span className="mono ml-auto font-bold text-ink">{s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({ values, height = 150, color = '#A435E8' }: { values: number[]; height?: number; color?: string }) {
  const w = 600;
  const h = height;
  const pad = 6;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1]?.[0] ?? w},${h} L${pts[0]?.[0] ?? 0},${h} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {n > 0 && <path d={area} fill="url(#areaFill)" />}
      {n > 0 && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
    </svg>
  );
}
