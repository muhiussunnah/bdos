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

/**
 * Stages a user can move a lead to (pickers, bulk move). One "Follow-up" entry:
 * attempts are counted by the system (followup1/2/3 are never chosen by hand).
 */
export const STAGES: { key: string; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Outreach sent' },
  { key: 'followup1', label: 'Follow-up' },
  { key: 'meeting', label: 'Meeting booked' },
  { key: 'positive', label: 'Active deal' },
  { key: 'closed', label: 'Won' },
  { key: 'lost', label: 'Disqualified' },
];

export function stageClass(stage: string) {
  return `s-${stage}`;
}

export function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}
