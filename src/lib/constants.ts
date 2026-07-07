export const BRAND = {
  name: 'BDOS',
  full: 'Business Development OS',
  tagline: 'The AI creates leverage. Your team closes.',
};

export type NavItem = { href: string; label: string; icon: string; group: string; badgeKey?: string };

export const NAV: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'agent' },
  { href: '/app/autopilot', label: 'Autopilot', icon: 'Sparkles', group: 'agent' },
  { href: '/app/leads', label: 'Leads', icon: 'Users', group: 'pipeline' },
  { href: '/app/companies', label: 'Companies', icon: 'Building2', group: 'pipeline' },
  { href: '/app/outreach', label: 'Outreach', icon: 'Send', group: 'pipeline' },
  { href: '/app/inbox', label: 'Inbox', icon: 'Inbox', group: 'pipeline', badgeKey: 'inbox' },
  { href: '/app/tasks', label: 'Tasks', icon: 'ListChecks', group: 'pipeline', badgeKey: 'tasks' },
  { href: '/app/reports', label: 'Reports', icon: 'BarChart3', group: 'system' },
  { href: '/app/knowledge', label: 'Knowledge Base', icon: 'BookOpen', group: 'system' },
  { href: '/app/projects', label: 'Projects', icon: 'FolderKanban', group: 'system' },
  { href: '/app/settings', label: 'Settings', icon: 'Settings', group: 'system' },
];

export const NAV_GROUPS: Record<string, string> = {
  agent: 'Agent',
  pipeline: 'Pipeline',
  system: 'System',
};

export type ProviderKey = 'openai' | 'anthropic' | 'google' | 'openrouter';

export const PROVIDERS: {
  key: ProviderKey;
  label: string;
  keyUrl: string;
  models: string[];
  placeholder: string;
}[] = [
  {
    key: 'openai',
    label: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
    placeholder: 'sk-...',
  },
  {
    key: 'anthropic',
    label: 'Anthropic',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-sonnet-4-5', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    placeholder: 'sk-ant-...',
  },
  {
    key: 'google',
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    placeholder: 'AIza...',
  },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    keyUrl: 'https://openrouter.ai/keys',
    models: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
    ],
    placeholder: 'sk-or-...',
  },
];

export const REPLY_CATEGORIES: { key: string; label: string; tone: string }[] = [
  { key: 'positive', label: 'Positive', tone: 'ok' },
  { key: 'interested', label: 'Interested', tone: 'ok' },
  { key: 'wants_info', label: 'Wants Info', tone: 'info' },
  { key: 'meeting_request', label: 'Meeting Request', tone: 'ok' },
  { key: 'referral', label: 'Referral', tone: 'info' },
  { key: 'partnership', label: 'Partnership', tone: 'ok' },
  { key: 'pricing', label: 'Pricing Question', tone: 'warn' },
  { key: 'objection', label: 'Objection', tone: 'warn' },
  { key: 'not_interested', label: 'Not Interested', tone: 'bad' },
  { key: 'unsubscribe', label: 'Unsubscribe', tone: 'bad' },
  { key: 'human_review', label: 'Human Review', tone: 'warn' },
];

export const LANGS: [string, string][] = [
  ['en', 'English'],
  ['sv', 'Svenska'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['es', 'Español'],
];
