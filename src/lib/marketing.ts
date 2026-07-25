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
  /** Competitor name for comparison posts — drives the "X vs Klientic" thumbnail. */
  vs?: string;
  /** Optional big line shown on the thumbnail for non-comparison posts. */
  kicker?: string;
  body: { h?: string; p?: string; list?: string[] }[];
}

export const POSTS: BlogPost[] = [
  {
    slug: 'claude-vs-klientic',
    title: 'Claude vs Klientic: a brilliant assistant vs a client-acquisition engine',
    excerpt: 'Claude writes a beautiful cold email. Klientic finds who to send it to, sends it, chases the follow-ups, triages the replies and books the meeting — while you sleep. Here’s the real difference.',
    date: '2026-07-22',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '8 min',
    category: 'Comparison',
    vs: 'Claude',
    gradient: 'linear-gradient(135deg,#C2410C 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Claude is one of the best writing and reasoning models on earth. Paste in a prospect, ask for a cold email, and what comes back is genuinely good — warm, specific, human. So it’s a fair question: if Claude can write the email, why do you need Klientic?' },
      { p: 'Because writing the email was never the hard part. The hard part is everything around it.' },
      { h: 'What Claude is brilliant at' },
      { p: 'Claude is an extraordinary assistant. It reasons, writes, summarises and answers. Give it context and it produces a great first draft of almost anything — including outreach. As a thinking partner, it’s hard to beat.' },
      { p: 'But Claude waits for you. It has no idea who your next fifty clients are, it never sends anything, it doesn’t remember to follow up on day three, and it will never tell you which reply is worth your time. It’s a genius that only moves when you prompt it.' },
      { h: 'The work a chat window leaves on your desk' },
      { p: 'Run the honest checklist of what it actually takes to win a client, and watch how much of it a chat window hands straight back to you:' },
      { list: [
        'Find companies that fit your offer — the right size, region and vertical',
        'Track down the decision-maker and their real contact details',
        'Score and prioritise so you work the best leads first',
        'Open the chat, paste context, generate a draft, copy it out, send it',
        'Remember to follow up on day 3, day 7 and day 21 — for every single lead',
        'Read every reply and decide what’s positive, what’s a brush-off, what needs you',
        'Book the meeting, prep for the call, log it, and report on it',
      ] },
      { p: 'Claude can help with exactly one line of that list — the drafting. You are still the system holding the other six together.' },
      { h: 'What Klientic does instead' },
      { p: 'Klientic isn’t a chat window. It’s the machine that runs the whole loop, unattended:' },
      { list: [
        'Discovers and enriches leads from a niche and region you describe once',
        'Scores every lead for fit and opportunity, then works the best first',
        'Writes outreach grounded in your knowledge base — never generic, never invented',
        'Sends, then follows up on a natural 3 / 7 / 21 cadence without being told',
        'Auto-classifies every reply into eleven categories and drafts the response',
        'Flags pricing, contracts and partnerships for a human — you keep the closing',
        'Books meetings, builds your call list, and reports exactly what happened',
      ] },
      { p: 'You set it up once per project. It hunts every day after that.' },
      { h: 'The twist: Klientic runs on Claude' },
      { p: 'This isn’t really Claude versus Klientic. Klientic is bring-your-own-key — plug in your Anthropic API key and Claude becomes the brain inside the machine. You get Claude’s writing quality and the entire acquisition system wrapped around it, at model cost with no markup.' },
      { p: 'A chat window gives you a brilliant model. Klientic gives you a brilliant model that also prospects, sends, follows up and books — on autopilot.' },
      { h: 'Who this is a must-have for' },
      { p: 'Freelancers and solo founders who can’t afford to spend their week prospecting instead of delivering. Agencies running outbound for several brands from one console. And any company that only grows when someone remembers to chase — which is every company.' },
      { p: 'If new clients matter to your income, the drafting was never your bottleneck. The system was. Start free, bring your own Claude key, and watch a pipeline fill itself overnight.' },
    ],
  },
  {
    slug: 'chatgpt-vs-klientic',
    title: 'ChatGPT vs Klientic: a chat window vs an outbound machine',
    excerpt: 'Everyone has a ChatGPT tab open. Almost no one has a pipeline that fills itself. The gap between the two is the difference between a tool you operate and a system that operates for you.',
    date: '2026-07-21',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '7 min',
    category: 'Comparison',
    vs: 'ChatGPT',
    gradient: 'linear-gradient(135deg,#0F9D8C 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'ChatGPT is the most familiar AI on the planet. Nearly everyone in sales has a tab open. And yet almost no one’s pipeline is actually growing on autopilot. Why?' },
      { p: 'Because a chat window is a tool you operate. Winning clients needs a system that operates without you.' },
      { h: 'What ChatGPT is great at' },
      { p: 'Brainstorming, rewriting, role-play, summarising a call, drafting a proposal. As an on-demand assistant it’s superb, and its ubiquity means everyone already knows how to use it.' },
      { p: 'But that ubiquity is also the problem. When every rep uses the same tool to write the same kind of email, "AI-written" becomes a smell buyers can spot. And no matter how good the draft, ChatGPT still can’t find the lead, send the message, or follow up next week.' },
      { h: 'A tab you open vs a system that runs' },
      { p: 'The moment you close the tab, ChatGPT stops. It has no memory of your pipeline, no cadence, no inbox. Every touch is a manual act: you decide, you prompt, you copy, you send, you remember. Miss a day and the pipeline misses a day.' },
      { p: 'Klientic is the opposite. It runs whether or not you show up:' },
      { list: [
        'Sources and scores leads for the niche you target — continuously',
        'Grounds every message in your knowledge base so it sounds like you, not like a template',
        'Sends and follows up on schedule, per lead, without a reminder',
        'Triages every reply and drafts the next move',
        'Escalates the human moments — pricing, contracts — to you',
        'Turns booked calls into a prepped call list and a weekly report',
      ] },
      { h: 'The twist: Klientic can run on OpenAI' },
      { p: 'You don’t have to choose your model. Klientic is bring-your-own-key and supports OpenAI, Anthropic, Gemini and OpenRouter. Plug in your OpenAI key and GPT powers the writing — inside a system that actually sends, chases and books.' },
      { h: 'Who this is a must-have for' },
      { p: 'Anyone whose income depends on a steady flow of new clients and who cannot afford for prospecting to stop the week they get busy delivering. Solo consultants, agencies, studios, SaaS teams — the ones who win are the ones whose outbound never sleeps.' },
      { p: 'ChatGPT helps you write. Klientic makes sure it gets written, sent, chased and booked. Start free and feel the difference in a week.' },
    ],
  },
  {
    slug: 'gemini-vs-klientic',
    title: 'Gemini vs Klientic: search-smart AI vs a system that wins clients',
    excerpt: 'Gemini can research a company in seconds. But knowing about a prospect and turning them into a client are two very different jobs — and only one of them fills your calendar.',
    date: '2026-07-20',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '7 min',
    category: 'Comparison',
    vs: 'Gemini',
    gradient: 'linear-gradient(135deg,#2563EB 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Gemini is fast, multimodal and wired into the world’s best search. Ask it about a company and you’ll get a crisp, well-sourced picture in seconds. For research, it’s a genuinely great tool.' },
      { p: 'But research is where most outbound dies, not where it wins. Knowing about a prospect and converting one are two different jobs.' },
      { h: 'What Gemini is great at' },
      { p: 'Pulling context, comparing options, digesting long documents, answering with fresh information. If your question is "tell me about X," Gemini is excellent.' },
      { p: 'The trouble is that "tell me about X" isn’t a growth strategy. After the answer, you still have to decide who to contact, write the message, send it, follow up, handle the reply and book the call. Gemini hands all of that back to you.' },
      { h: 'Knowing vs doing' },
      { p: 'This is the quiet gap in every AI-assisted outbound stack: the model knows, but you still have to do. Multiply the doing across hundreds of leads and a three-touch cadence, and it’s simply more than any person keeps up with by hand.' },
      { p: 'Klientic closes the gap by turning knowing into doing, automatically:' },
      { list: [
        'Finds fitting companies and the right decision-maker — not just facts about them',
        'Scores each lead so your effort lands on the best opportunities first',
        'Writes and sends outreach grounded in your own knowledge base',
        'Runs the 3 / 7 / 21 follow-up rhythm for every lead, unprompted',
        'Classifies replies, drafts responses, and flags the human moments',
        'Books meetings and reports what moved — every week',
      ] },
      { h: 'The twist: Klientic can run on Gemini' },
      { p: 'Love Gemini’s output? Keep it. Klientic is bring-your-own-key and supports Google Gemini alongside OpenAI, Anthropic and OpenRouter. Gemini becomes the intelligence; Klientic becomes the system that acts on it — at model cost, never marked up.' },
      { h: 'Who this is a must-have for' },
      { p: 'Every individual who sells their time and every company that needs a predictable flow of clients. Research alone has never signed a contract. The teams that grow are the ones that turn research into contacted, chased, booked conversations — automatically.' },
      { p: 'Gemini tells you about the market. Klientic goes and wins it. Start free and point it at your niche today.' },
    ],
  },
  {
    slug: 'perplexity-vs-klientic',
    title: 'Perplexity vs Klientic: an answer engine vs a client engine',
    excerpt: 'Perplexity gives you sourced answers. Klientic gives you booked meetings. One ends the moment your question is answered — the other keeps working until your calendar is full.',
    date: '2026-07-18',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '7 min',
    category: 'Comparison',
    vs: 'Perplexity',
    gradient: 'linear-gradient(135deg,#1E3A8A 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Perplexity is a superb answer engine. Ask a question, get a clean, cited response you can trust. For research and fact-finding, it has changed how a lot of us work.' },
      { p: 'But an answer engine ends the moment your question is answered. A client engine keeps going until your calendar is full. That’s the difference.' },
      { h: 'What Perplexity is great at' },
      { p: 'Fast, sourced answers. Market scans. "Who are the top firms in this space." It’s a brilliant way to understand a landscape without wading through ten tabs.' },
      { p: 'And then it stops. Perplexity won’t reach out to those firms, won’t write to the decision-maker, won’t follow up, and won’t tell you who replied warmly. The research is done; the selling hasn’t started.' },
      { h: 'From a list of names to a full calendar' },
      { p: 'Getting a list of promising companies feels like progress, but it’s the easy 10%. The 90% is the relentless follow-through — contact, cadence, replies, booking — repeated across every name on the list, every week, without fail.' },
      { p: 'That relentlessness is exactly what Klientic automates:' },
      { list: [
        'Turns a niche into a scored, enriched list of real, contactable leads',
        'Writes outreach grounded in your knowledge base — accurate and on-brand',
        'Sends and follows up on a 3 / 7 / 21 cadence for every lead automatically',
        'Auto-classifies replies into eleven categories and drafts the next message',
        'Hands pricing, contracts and partnerships to a human at the right moment',
        'Books the meeting and shows you a weekly report of what happened',
      ] },
      { h: 'The twist: bring any brain you like' },
      { p: 'Klientic is model-agnostic and bring-your-own-key — OpenAI, Anthropic, Gemini or OpenRouter. Use whichever engine you trust for the thinking; Klientic supplies the system that turns thinking into booked meetings.' },
      { h: 'Who this is a must-have for' },
      { p: 'Any person or company that needs clients and is tired of research that never becomes revenue. Freelancers, agencies, founders, sales teams — if a full calendar matters to you, an answer engine was never going to get you there.' },
      { p: 'Perplexity answers your question. Klientic fills your pipeline. Start free and let it run.' },
    ],
  },
  {
    slug: 'ai-is-not-the-salesperson',
    title: 'The AI is not the salesperson — it’s the leverage',
    excerpt: 'The best outbound teams don’t replace humans with AI. They put AI underneath humans, and let it do everything except the closing.',
    date: '2026-07-10',
    author: 'The Klientic Team',
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
    author: 'The Klientic Team',
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
    author: 'The Klientic Team',
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
