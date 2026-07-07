import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const s = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  return s || '?';
}

export function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export function relTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function scoreColor(score: number) {
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return 'var(--amber)';
  return 'var(--faint)';
}

export function priorityFromScores(fit: number, opp: number): 'A' | 'B' | 'C' {
  const avg = (fit + opp) / 2;
  if (avg >= 78) return 'A';
  if (avg >= 55) return 'B';
  return 'C';
}

export const STAGES: { key: string; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'followup1', label: 'Follow-up 1' },
  { key: 'followup2', label: 'Follow-up 2' },
  { key: 'followup3', label: 'Follow-up 3' },
  { key: 'positive', label: 'Positive' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'closed', label: 'Closed' },
];

export function stageClass(stage: string) {
  return `s-${stage}`;
}

export function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}
