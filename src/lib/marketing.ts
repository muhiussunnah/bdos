// ── Public marketing site content ───────────────────────────────────────────

export const MKT_NAV = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
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

export const TIERS = [
  {
    name: 'Starter',
    price: 29,
    tagline: 'For solo founders opening their first pipeline.',
    features: ['1 project', 'Up to 500 leads', 'AI outreach & follow-ups', 'Inbox intelligence', 'Bring your own AI key', 'Email support'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: 79,
    tagline: 'For teams running outbound across several businesses.',
    features: ['5 projects', 'Up to 10,000 leads', 'Everything in Starter', 'Daily reports & call lists', 'Knowledge base per project', 'Priority support'],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Scale',
    price: 199,
    tagline: 'For agencies and multi-brand operators.',
    features: ['Unlimited projects', 'Unlimited leads', 'Everything in Growth', 'Admin console & seats', 'Automation scheduling', 'Dedicated success manager'],
    cta: 'Talk to us',
    highlight: false,
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

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  role: string;
  readTime: string;
  category: string;
  gradient: string;
  body: { h?: string; p?: string }[];
}

export const POSTS: BlogPost[] = [
  {
    slug: 'ai-is-not-the-salesperson',
    title: 'The AI is not the salesperson — it’s the leverage',
    excerpt: 'The best outbound teams don’t replace humans with AI. They put AI underneath humans, and let it do everything except the closing.',
    date: '2026-07-10',
    author: 'The BDOS Team',
    role: 'Product',
    readTime: '5 min',
    category: 'Philosophy',
    gradient: 'linear-gradient(135deg,#A435E8,#E0457E)',
    body: [
      { p: 'There’s a tempting fantasy in sales software right now: point an AI at a market and let it close deals while you sleep. It doesn’t work, and it shouldn’t. Relationships are still human.' },
      { h: 'Where AI actually wins' },
      { p: 'Research, list-building, first-draft outreach, follow-up discipline, inbox triage, and call prep. These are the tasks that quietly eat a rep’s week — and they are exactly where a tireless agent creates leverage.' },
      { p: 'When you remove that load, your salespeople spend their hours on the 5% of the funnel that actually needs a human: the nuanced conversation, the negotiation, the trust.' },
      { h: 'The rule we build around' },
      { p: 'The AI drafts, the human decides. On anything involving pricing, contracts, exclusivity or strategy, the agent stops and hands off. That single rule keeps outbound fast without ever feeling automated to the person on the other end.' },
    ],
  },
  {
    slug: 'follow-up-cadence-that-converts',
    title: 'The follow-up cadence that actually converts',
    excerpt: 'Most deals are lost in the gap between the first email and the third. Here’s the 3/7/21 rhythm and why it works.',
    date: '2026-07-03',
    author: 'The BDOS Team',
    role: 'Growth',
    readTime: '4 min',
    category: 'Playbook',
    gradient: 'linear-gradient(135deg,#2563EB,#A435E8)',
    body: [
      { p: 'A single cold email has a reply rate you can round to zero. The magic is in the follow-up — but only if it stays human.' },
      { h: 'Why 3 / 7 / 21' },
      { p: 'Three days is enough to escape the inbox pile without feeling pushy. Seven days catches the "meant to reply" crowd. Twenty-one days is the polite last knock that reactivates a surprising number of dormant threads.' },
      { h: 'The catch' },
      { p: 'Each touch must add a new angle, never just "bumping this up." Our agent references the prior note lightly and brings one fresh, relevant reason to talk — which is why the third email often outperforms the first.' },
    ],
  },
  {
    slug: 'grounding-outreach-in-knowledge',
    title: 'Why we never let the AI make things up',
    excerpt: 'Hallucinated claims kill trust in one line. Grounding every message in your knowledge base is the difference between a tool you can send and one you can’t.',
    date: '2026-06-24',
    author: 'The BDOS Team',
    role: 'Engineering',
    readTime: '6 min',
    category: 'Engineering',
    gradient: 'linear-gradient(135deg,#16A34A,#2563EB)',
    body: [
      { p: 'The fastest way to lose a prospect is to claim something about your product that isn’t true. With generative models, that risk is real — unless you constrain it.' },
      { h: 'Knowledge base as the source of truth' },
      { p: 'Every project has its own repository: pitch, pricing, FAQs, objection handling. When the agent writes or replies, that material is the only ground it stands on. If a fact isn’t there, it won’t assert it.' },
      { h: 'The result' },
      { p: 'Outreach that sounds like it was written by someone who actually works at your company — because, functionally, it was. You feed it the truth; it does the typing.' },
    ],
  },
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
