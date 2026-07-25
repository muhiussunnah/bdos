// ── Public marketing site content ───────────────────────────────────────────

export const MKT_NAV = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const FEATURES = [
  {
    icon: 'Radar',
    title: 'Lead Discovery Agent',
    desc: 'Point it at a niche and a region — it finds fitting companies, decision-makers and contact details, then scores each on fit and opportunity.',
  },
  {
    icon: 'PenLine',
    title: 'Human Outreach Engine',
    desc: 'Personal, short, on-brand emails written in your prospect’s language. Never salesy, never robotic — grounded in your knowledge base.',
  },
  {
    icon: 'Repeat',
    title: 'Follow-up on Autopilot',
    desc: 'A natural 3 / 7 / 21-day cadence that chases replies for you. Configurable per project, always conversational — never aggressive.',
  },
  {
    icon: 'Inbox',
    title: 'Inbox Intelligence',
    desc: 'Every reply auto-classified into 11 categories. Simple ones get a drafted answer; pricing, contracts and partnerships are flagged for a human.',
  },
  {
    icon: 'ListChecks',
    title: 'Daily Call List',
    desc: 'A prioritized call list rebuilt from your live pipeline each morning — who to call, why, and exactly how to open.',
  },
  {
    icon: 'BookOpen',
    title: 'Grounded Knowledge Base',
    desc: 'Upload your pitch, pricing and scripts. The agent only speaks with facts you gave it — it never invents information.',
  },
];

export const STEPS = [
  { n: '01', title: 'Describe your business', desc: 'Add your product, sales voice, target industries and knowledge base — once per project.' },
  { n: '02', title: 'Let the agent hunt', desc: 'It discovers and scores leads, then writes the first outreach for your approval.' },
  { n: '03', title: 'It follows up & triages', desc: 'Replies are classified, follow-ups sent, and hot leads pushed to your call list.' },
  { n: '04', title: 'Your team closes', desc: 'Walk into every call prepared in under 60 seconds. The AI creates leverage — you close.' },
];

export const PROVIDERS_LOGOS = ['OpenAI', 'Anthropic', 'Google Gemini', 'OpenRouter', 'Resend', 'Supabase'];

export interface Tier {
  name: string;
  monthly: number;
  lifetime: number;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
}

export const TIERS: Tier[] = [
  {
    name: 'Starter',
    monthly: 49,
    lifetime: 399,
    tagline: 'For solo founders opening their first pipeline.',
    features: ['1 project', 'Up to 500 leads / mo', 'AI outreach & follow-ups', 'Inbox intelligence', 'Bring your own AI key', 'Email support'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Growth',
    monthly: 89,
    lifetime: 699,
    tagline: 'For teams running outbound across several businesses.',
    features: ['5 projects', 'Up to 10,000 leads / mo', 'Everything in Starter', 'Daily reports & call lists', 'Knowledge base per project', 'Priority support'],
    cta: 'Start free trial',
    highlight: true,
    badge: 'MOST POPULAR',
  },
  {
    name: 'Scale',
    monthly: 199,
    lifetime: 999,
    tagline: 'For agencies and multi-brand operators.',
    features: ['Unlimited projects', 'Unlimited leads', 'Everything in Growth', 'Admin console & seats', 'Automation scheduling', 'Dedicated success manager'],
    cta: 'Talk to us',
    highlight: false,
    badge: 'BEST VALUE',
  },
];

export const FAQS = [
  { q: 'Do I need my own AI keys?', a: 'Yes — you plug in your own OpenAI, Anthropic, Google Gemini or OpenRouter key. That means you control the model and pay AI costs at cost, with no markup from us.' },
  { q: 'What language is the outreach written in?', a: 'Any language you set per project. The platform can be in English while your emails go out in Swedish, German, French — whatever your market speaks.' },
  { q: 'Is the AI going to spam people?', a: 'No. Outreach is short, personal and grounded in your knowledge base, with a natural follow-up cadence you control. You approve sends, and the agent never invents facts.' },
  { q: 'Can I run more than one business?', a: 'That’s the whole point. Each project is fully isolated — its own leads, voice, language and knowledge base — so agencies and multi-brand teams run everything from one place.' },
  { q: 'How does email sending work?', a: 'Through Resend with your own verified domain, so replies land in your inbox and your deliverability stays yours.' },
  { q: 'Is my data private?', a: 'Every row is protected by row-level security and scoped to your workspace. Your keys and data are never shared across accounts.' },
];

export const TESTIMONIALS = [
  { quote: 'We went from 3 cold emails a week to a full pipeline that follows itself up. Our reps only touch warm conversations now.', name: 'Sofia Lindqvist', role: 'Head of Partnerships' },
  { quote: 'It writes better first-touch emails in Swedish than our junior SDRs did in English. The reply rate speaks for itself.', name: 'Marcus Bergström', role: 'Founder' },
  { quote: 'Running four brands from one console with separate knowledge bases changed how our agency operates.', name: 'Aisha Rahman', role: 'Agency Director' },
];

// Blog content lives in ./posts — re-exported here so existing imports keep working.
export type { BlogPost } from './posts';
export { POSTS, getPost, BLOG_PER_PAGE } from './posts';
