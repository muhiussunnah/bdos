import type { Stage } from '@/lib/types';

/**
 * The 7-step sales pipeline shown on the dashboard, the inbox and the leads page.
 * Each step groups one or more database stages (`leads.stage`); `target` is the
 * stage a lead gets when you "mark" it as this step.
 */
export type PipelineKey = 'lead' | 'contacted' | 'followup' | 'meeting' | 'deal' | 'won' | 'disqualified';

export interface PipelineStep {
  key: PipelineKey;
  n: number;
  label: string;
  hint: string;
  emoji: string;
  /** database stages that belong to this step */
  stages: Stage[];
  /** stage written when a lead is moved here */
  target: Stage;
  /** accent colour (solid) — tiles use a soft mix of it */
  color: string;
}

export const PIPELINE: PipelineStep[] = [
  { key: 'lead', n: 1, label: 'Lead', hint: 'Not contacted yet', emoji: '🔭', stages: ['new'], target: 'new', color: '#7C3AED' },
  { key: 'contacted', n: 2, label: 'Outreach sent', hint: 'Emailed — now call or email again', emoji: '✈️', stages: ['contacted'], target: 'contacted', color: '#2563EB' },
  { key: 'followup', n: 3, label: 'Follow-up', hint: 'We tried — next action is scheduled', emoji: '🕒', stages: ['followup1', 'followup2', 'followup3'], target: 'followup1', color: '#E08C1F' },
  { key: 'meeting', n: 4, label: 'Meeting booked', hint: 'In calendar', emoji: '📅', stages: ['meeting'], target: 'meeting', color: '#DB2777' },
  { key: 'deal', n: 5, label: 'Active deal', hint: 'Proposal sent', emoji: '📄', stages: ['positive'], target: 'positive', color: '#0891B2' },
  { key: 'won', n: 6, label: 'Won', hint: 'Agreement signed', emoji: '🎉', stages: ['closed'], target: 'closed', color: '#16A34A' },
  { key: 'disqualified', n: 7, label: 'Disqualified', hint: 'Not a fit / no interest', emoji: '❌', stages: ['lost'], target: 'lost', color: '#E5484D' },
];

export const PIPELINE_BY_KEY: Record<PipelineKey, PipelineStep> = Object.fromEntries(PIPELINE.map((p) => [p.key, p])) as Record<PipelineKey, PipelineStep>;

export function isPipelineKey(v: string | null | undefined): v is PipelineKey {
  return !!v && v in PIPELINE_BY_KEY;
}

/** The pipeline step a database stage belongs to. */
export function stepOf(stage: string): PipelineStep {
  return PIPELINE.find((p) => (p.stages as string[]).includes(stage)) || PIPELINE[0];
}

/** Human label for a database stage, matching the pipeline cards. */
export function stageLabel(stage: string): string {
  switch (stage) {
    case 'new': return 'New';
    case 'contacted': return 'Outreach sent';
    case 'followup1': return 'Follow-up · Attempt 1';
    case 'followup2': return 'Follow-up · Attempt 2';
    case 'followup3': return 'Follow-up · Attempt 3';
    case 'positive': return 'Active deal';
    case 'meeting': return 'Meeting booked';
    case 'closed': return 'Won';
    case 'lost': return 'Disqualified';
    default: return stage;
  }
}

/** Soft tinted background for a step, readable in light and dark mode. */
export function stepTint(p: PipelineStep, strength = 12): string {
  return `color-mix(in srgb, ${p.color} ${strength}%, var(--surface))`;
}
