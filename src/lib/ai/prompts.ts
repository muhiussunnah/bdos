import type { Project, Lead } from '@/lib/types';
import { LANGS } from '@/lib/constants';

function langName(code: string) {
  return LANGS.find((l) => l[0] === code)?.[1] || 'English';
}

export function projectContext(p: Project, knowledge?: string) {
  const kb = knowledge?.trim()
    ? `\n\nKNOWLEDGE BASE (the ONLY facts you may state about us — never invent beyond this):\n${knowledge.slice(0, 8000)}`
    : '';
  return `You work as the AI business-development engine for this company:
• Company: ${p.name}
• Website: ${p.website || 'n/a'}
• What we do: ${p.product_description || 'n/a'}
• Company info: ${p.company_info || 'n/a'}
• Sales guidance: ${p.sales_instructions || 'Be warm, human and specific.'}
• Target industries: ${(p.target_industries || []).join(', ') || 'broad'}
• Outreach language: ${langName(p.outreach_language)}${kb}`;
}

// ── Lead discovery ──────────────────────────────────────────────────────────
export function discoveryPrompt(p: Project, category: string, area: string, count: number, knowledge?: string) {
  return {
    system: `${projectContext(p, knowledge)}

You are a lead-research agent. Find real, plausible ${category} organisations in/near ${area} that would be a strong fit as customers or partners. For each, estimate a Fit Score (1-100, how well they match our ideal customer) and an Opportunity Score (1-100, likelihood & value of a deal). Prefer specific, named, findable organisations over generic placeholders.`,
    user: `Return ${count} leads as strict JSON: {"leads":[{"company_name","website","industry","location","contact_name","role","email","phone","linkedin_url","reason","fit_score","opportunity_score"}]}. Use null for anything you genuinely don't know — never fabricate emails or phone numbers. "reason" = one sentence on why they are relevant to us. Category: ${category}. Area: ${area}.`,
  };
}

// ── Outreach email ──────────────────────────────────────────────────────────
export function outreachPrompt(p: Project, lead: Lead, step: number, knowledge?: string) {
  const lang = langName(p.outreach_language);
  const kind =
    step === 0
      ? 'a first cold outreach email'
      : `follow-up #${step} (no reply yet). Reference the earlier note lightly, add one new angle, stay friendly — never pushy.`;
  return {
    system: `${projectContext(p, knowledge)}

You write ${kind}. Rules — this is critical:
• Write ENTIRELY in ${lang}, regardless of these instructions being in English.
• Human sounding, short (60-110 words), personal, specific to the recipient.
• Not salesy, not corporate, no buzzwords, no "I hope this email finds you well".
• One clear, low-friction ask. Never sound automated.`,
    user: `Recipient company: ${lead.company_name} (${lead.industry || ''}, ${lead.location || ''}).
Contact: ${lead.contact_name || 'there'}${lead.role ? ', ' + lead.role : ''}.
Why relevant: ${lead.reason || 'good fit'}.
Return strict JSON: {"subject": "...", "body": "..."} — body in ${lang}, with real line breaks.`,
  };
}

// ── Inbox classification + optional auto-reply draft ────────────────────────
export function classifyPrompt(p: Project, lead: Lead | null, replyText: string, knowledge?: string) {
  return {
    system: `${projectContext(p, knowledge)}

You are an inbox-intelligence agent. Classify an incoming reply and decide who handles it.
Categories: positive, interested, wants_info, meeting_request, referral, not_interested, unsubscribe, objection, pricing, partnership, human_review.
The AI may draft an auto-reply ONLY when the message is simple and involves NO pricing, contract, partnership, exclusivity or strategic negotiation. In those sensitive cases set needs_human=true and draft is null.`,
    user: `Reply from ${lead?.company_name || 'a prospect'}:
"""${replyText.slice(0, 4000)}"""
Return strict JSON: {"category","confidence"(0-1),"needs_human"(bool),"summary"(one line),"draft":{"subject","body"}|null}. Draft in ${langName(p.outreach_language)}.`,
  };
}

// ── Meeting prep ────────────────────────────────────────────────────────────
export function meetingPrepPrompt(p: Project, lead: Lead, knowledge?: string) {
  return {
    system: `${projectContext(p, knowledge)}

You prepare a sales manager to walk into a call in under 60 seconds. Be concrete and skimmable.`,
    user: `Prepare for a call with ${lead.company_name} (${lead.industry || ''}, ${lead.location || ''}). Contact: ${lead.contact_name || ''} ${lead.role || ''}.
Return strict JSON: {"summary","what_they_do","why_relevant","talking_points":[..],"objections":[..],"next_steps":[..]}.`,
  };
}

// ── Daily report ────────────────────────────────────────────────────────────
export function reportPrompt(p: Project, metrics: Record<string, number>, hot: Lead[]) {
  return {
    system: `${projectContext(p)}

You write a crisp daily management report for the sales leader. Warm, factual, no fluff.`,
    user: `Today's numbers: ${JSON.stringify(metrics)}.
Hottest leads: ${JSON.stringify(hot.map((l) => ({ company: l.company_name, stage: l.stage, why: l.reason })))}.
Return strict JSON: {"summary"(2-4 sentences), "top_opportunities":[{"company","reason"}] (max 5)}.`,
  };
}
