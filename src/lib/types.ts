export type Priority = 'A' | 'B' | 'C';
export type Stage =
  | 'new' | 'contacted' | 'followup1' | 'followup2' | 'followup3'
  | 'positive' | 'meeting' | 'closed' | 'lost';
export type MsgDirection = 'outbound' | 'inbound';
export type MsgStatus = 'draft' | 'scheduled' | 'sent' | 'failed' | 'received';
export type ReplyCategory =
  | 'positive' | 'interested' | 'wants_info' | 'meeting_request' | 'referral'
  | 'not_interested' | 'unsubscribe' | 'objection' | 'pricing' | 'partnership' | 'human_review';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  plan: string;
  blocked: boolean;
  block_message: string | null;
  ref_code: string | null;
  referred_by: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  company_info: string | null;
  website: string | null;
  product_description: string | null;
  sales_instructions: string | null;
  target_industries: string[];
  outreach_language: string;
  follow_up_days: number[];
  ai_model: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  project_id: string;
  owner_id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  contact_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  reason: string | null;
  fit_score: number;
  opportunity_score: number;
  priority: Priority;
  stage: Stage;
  followup_step: number;
  tags: string[];
  notes: string | null;
  source: string;
  last_contacted_at: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  lead_id: string | null;
  project_id: string;
  owner_id: string;
  direction: MsgDirection;
  subject: string | null;
  body: string | null;
  status: MsgStatus;
  category: ReplyCategory | null;
  ai_meta: Record<string, unknown>;
  needs_human: boolean;
  handled: boolean;
  provider_message_id: string | null;
  from_email: string | null;
  to_email: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  owner_id: string;
  lead_id: string | null;
  type: 'call' | 'email' | 'followup' | 'review';
  priority: Priority;
  title: string;
  reason: string | null;
  suggested_opening: string | null;
  suggested_next_step: string | null;
  due_at: string | null;
  status: 'open' | 'done' | 'snoozed';
  created_at: string;
}

export interface KnowledgeDoc {
  id: string;
  project_id: string;
  owner_id: string;
  title: string;
  kind: string;
  source_url: string | null;
  content: string | null;
  tokens: number;
  created_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  owner_id: string;
  report_date: string;
  metrics: Record<string, number>;
  summary: string | null;
  top_opportunities: Array<{ company: string; reason: string }>;
  created_at: string;
}

/** A sending identity. Stored as `user_settings.data.senders[]`; the default one mirrors from_name / from_email. */
export interface Sender {
  id: string;
  name: string;
  email: string;
  isDefault?: boolean;
}

export interface UserSettings {
  owner_id: string;
  default_provider: string;
  default_model: string;
  language: string;
  from_name: string | null;
  from_email: string | null;
  theme: string;
  data: Record<string, unknown>;
}
