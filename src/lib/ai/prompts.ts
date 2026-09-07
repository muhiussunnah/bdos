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
export interface DiscoveryGeo { country?: string; region?: string; subcity?: string }

/** Human-readable "Sigtuna, Stockholm, Sweden" style location from the structured fields. */
export function describeGeo(g: DiscoveryGeo): string {
  return [g.subcity, g.region, g.country].map((s) => (s || '').trim()).filter(Boolean).join(', ') || 'anywhere';
}

export function discoveryPrompt(p: Project, categories: string[], geo: DiscoveryGeo, count: number, knowledge?: string) {
  const cats = categories.map((c) => c.trim()).filter(Boolean);
  const catText = cats.length > 1 ? `these categories / niches: ${cats.map((c) => `"${c}"`).join(', ')}` : `"${cats[0] || 'relevant'}"`;
  const where = describeGeo(geo);
  const geoRules = [
    geo.country && `Country: ${geo.country} — every lead MUST be located in this country.`,
    geo.region && `Region / city: ${geo.region} — leads must be in or right next to it.`,
    geo.subcity && `Preferred locality: ${geo.subcity} — prioritise organisations physically located there before widening to the rest of ${geo.region || geo.country}.`,
  ].filter(Boolean).join('\n');
  return {
    system: `${projectContext(p, knowledge)}

You are a lead-research agent. Find real, plausible organisations matching ${catText} in/near ${where} that would be a strong fit as customers or partners. For each, estimate a Fit Score (1-100, how well they match our ideal customer) and an Opportunity Score (1-100, likelihood & value of a deal). Prefer specific, named, findable organisations over generic placeholders.${cats.length > 1 ? ' Spread the results across the categories so each niche is represented.' : ''}
${geoRules}
EMAIL IS MANDATORY: we can only contact leads by email, so every lead MUST include a real, publicly listed email address for the organisation — the general contact address is fine (info@, hello@, kontakt@, booking@, contact@, or a named person's address when it is public). Prefer addresses on the organisation's own website domain. Leads without an email are useless and will be discarded, so skip any organisation whose email you cannot provide and pick another one instead. Never invent an address that does not exist.`,
    user: `Return ${count} leads as strict JSON: {"leads":[{"company_name","website","industry","location","contact_name","role","email","phone","linkedin_url","reason","fit_score","opportunity_score"}]}. "email" is required for every lead (general contact address is acceptable). Use null for other fields you genuinely don't know — never fabricate phone numbers. "location" must be the town + country. "industry" should name which of the requested categories the lead belongs to. "reason" = one sentence on why they are relevant to us. Categories: ${cats.join(', ') || 'relevant'}. Location: ${where}.`,
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
