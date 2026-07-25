// ── Blog content ─────────────────────────────────────────────────────────────
// Rich, block-based posts: prose + data stats + comparison tables + callouts + CTAs.

export interface StatItem {
  value: string;
  label: string;
}
export interface CompareRow {
  row: string;
  them: string; // "✓" | "✗" | short text
  us: string;
}
export interface BlogBlock {
  h?: string;
  p?: string;
  list?: string[];
  stats?: StatItem[];
  compare?: { title?: string; them: string; rows: CompareRow[] };
  callout?: { title: string; text: string };
  quote?: string;
  cta?: boolean;
}

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
  vs?: string;
  kicker?: string;
  featured?: boolean;
  body: BlogBlock[];
}

export const BLOG_PER_PAGE = 6;

const CTA: BlogBlock = { cta: true };
const PRODUCT_STATS: BlogBlock = {
  stats: [
    { value: '10+', label: 'sources researched per lead' },
    { value: '3·7·21', label: 'day follow-ups, automatic' },
    { value: '24/7', label: 'the agent never stops' },
    { value: '<60s', label: 'to prep for any call' },
  ],
};
const SEVEN_JOBS: BlogBlock = {
  list: [
    'Find companies that fit your offer — the right size, region and vertical',
    'Track down the decision-maker and their real contact details',
    'Score and prioritise so you work the best leads first',
    'Write the message, personalised and grounded in the truth about you',
    'Actually send it — then follow up on day 3, day 7 and day 21',
    'Read every reply and decide what’s hot, what’s a brush-off, what needs you',
    'Book the meeting, prep for the call, log it and report on it',
  ],
};
const KLIENTIC_DOES: BlogBlock = {
  list: [
    'Discovers and enriches leads from a niche and region you describe once',
    'Scores every lead for fit and opportunity, then works the best first',
    'Writes outreach grounded in your knowledge base — never generic, never invented',
    'Sends, then follows up on a natural 3 / 7 / 21 cadence without being told',
    'Auto-classifies every reply into eleven categories and drafts the response',
    'Flags pricing, contracts and partnerships for a human — you keep the closing',
    'Books meetings, builds your call list, and reports exactly what happened',
  ],
};
const vsCompare = (them: string): BlogBlock => ({
  compare: {
    title: `${them} vs Klientic`,
    them,
    rows: [
      { row: 'Answer questions & write drafts', them: '✓', us: '✓' },
      { row: 'Find & enrich fitting leads', them: '✗', us: '✓' },
      { row: 'Score and prioritise opportunities', them: '✗', us: '✓' },
      { row: 'Actually send the outreach', them: '✗', us: '✓' },
      { row: 'Follow up on a 3 / 7 / 21 cadence', them: '✗', us: '✓' },
      { row: 'Auto-classify every reply', them: '✗', us: '✓' },
      { row: 'Book meetings & build call lists', them: '✗', us: '✓' },
      { row: 'Runs unattended, 24/7', them: '✗', us: '✓' },
      { row: `Use ${them}’s model as the brain`, them: '—', us: '✓' },
    ],
  },
});
const FIRST_WEEK: BlogBlock[] = [
  { h: 'What actually changes in your first week' },
  { p: 'The difference isn’t theoretical — you feel it in days. On day one you describe your offer and your ideal customer once, and paste in your pitch, pricing and FAQs. That’s the whole setup. From that moment the agent starts working a real list of real companies, not a demo.' },
  { p: 'By day two or three the first grounded emails are drafted and going out, each one referencing something specific about the company it’s written to. There’s no blank page, no “I’ll get to prospecting tomorrow,” no tab-switching. The pipeline is simply moving.' },
  { p: 'By the end of week one the follow-ups you would never have remembered are already sending themselves, the first replies are landing pre-sorted into categories, and the warm ones are sitting on a call list with a one-line reason to phone. You did none of the busywork — and yet the pipeline looks like you spent the week on it.' },
];
const OBJECTION: BlogBlock[] = [
  { h: 'But isn’t automated outreach just spam?' },
  { p: 'It’s the first question everyone asks, and it’s the right one. The answer is in how the messages are written. Every email is grounded in your knowledge base and personalised to the company it’s going to — short, specific and human, not a template blasted to ten thousand addresses. If a fact isn’t in your material, the agent won’t claim it.' },
  { p: 'And the human stays in charge of the human moments. The moment a conversation touches pricing, a contract or anything strategic, the agent stops and hands it to you. Volume never comes at the cost of trust, because the person on the other end always meets a real reply when it matters.' },
];
const MATH: BlogBlock = {
  callout: {
    title: 'The math that makes it a no-brainer',
    text: 'A single won client usually covers a year of Klientic several times over. You bring your own AI key, so you pay model costs at cost — never marked up — while the system prospects around the clock for a flat fee. One recovered deal pays for everything.',
  },
};

export const POSTS: BlogPost[] = [
  // ─────────── FEATURED (pinned on every page) ───────────
  {
    slug: 'why-everyone-needs-klientic',
    title: 'Why Klientic is a must-have for every person and every business alive',
    excerpt: 'Whether you freelance, run an agency, lead a sales team or are about to launch — your income depends on a steady flow of clients. Klientic is the one system that produces that flow on autopilot. Here’s the full case, with the numbers.',
    date: '2026-07-24',
    author: 'The Klientic Team',
    role: 'Founders',
    readTime: '10 min',
    category: 'Manifesto',
    featured: true,
    kicker: 'The one tool everyone who needs clients can’t work without.',
    gradient: 'linear-gradient(135deg,#7C2FD6 0%,#A435E8 45%,#E0457E 100%)',
    body: [
      { p: 'Strip away the job titles and every working person on earth is doing one of two things: finding people who’ll pay them, or delivering to the people who already do. The second is where your talent lives. The first is where your income is actually decided — and it’s the part almost everyone does badly, late, or not at all.' },
      { p: 'Not because people are lazy. Because prospecting is relentless, repetitive and endlessly easy to postpone when real work is on fire. So pipelines dry up the exact week you’re too busy to fill them, and the feast-or-famine cycle begins: a great month, then a scramble, then a quiet stretch you swear you’ll never repeat, then a great month again.' },
      { p: 'Klientic exists to end that cycle for good — by turning the entire client-getting motion into a system that runs whether or not you show up. Not a chatbot you prompt. An autonomous engine that researches, writes, sends, follows up, triages and books, every single day.' },
      { h: 'The engine, by the numbers' },
      { p: 'Before the philosophy, the mechanics. This is what the agent is doing in the background while you get on with your actual work:' },
      PRODUCT_STATS,
      { p: 'Ten-plus sources researched per lead so the outreach is specific. A 3 / 7 / 21-day follow-up rhythm that never forgets a soul. Round-the-clock operation, because pipelines don’t keep office hours. And under a minute of prep before any call, because the agent already assembled the context. None of it needs a human hovering over it.' },
      { h: 'Everyone is in sales now — most just don’t have the system' },
      { p: 'The freelance designer needs clients. The agency needs accounts. The founder needs their first ten customers. The consultant needs a full calendar. The local studio needs a steady drip of enquiries. Even the job-seeker is running outbound — they just call it applications. The need is genuinely universal; the tooling, until now, was not.' },
      { p: 'Here’s what Klientic does for every one of them, on autopilot:' },
      KLIENTIC_DOES,
      { callout: { title: 'The rule we build around', text: 'The AI drafts; the human decides. On anything involving money, contracts or strategy, the agent stops and hands off — so outbound stays fast without ever feeling automated to the person on the other end.' } },
      { cta: true },
      { h: 'The manual way vs the Klientic way' },
      { p: 'Put the two approaches side by side and the gap stops being subtle. One depends on a person having the time, memory and discipline to do the same relentless loop every day. The other just does it.' },
      {
        compare: {
          title: 'Doing it by hand vs running Klientic',
          them: 'By hand',
          rows: [
            { row: 'Leads found & scored every day', them: 'When you remember', us: 'Automatically' },
            { row: 'Follow-ups sent on time', them: 'Rarely past #2', us: 'Every 3 / 7 / 21' },
            { row: 'Replies triaged & drafted', them: 'Inbox chaos', us: '11 categories' },
            { row: 'Works while you sleep', them: '✗', us: '✓' },
            { row: 'Runs across several brands', them: 'A whole team', us: 'One console' },
            { row: 'Cost of an extra "rep"', them: 'A salary', us: 'A subscription' },
          ],
        },
      },
      ...FIRST_WEEK,
      ...OBJECTION,
      { h: 'The math is almost unfair' },
      { p: 'A single won client usually covers a year of Klientic several times over. Now weigh that against the alternative: the hours you burn prospecting by hand, or the salary of a person to do it. You bring your own AI key, so you pay model costs at cost — never marked up — and the system runs around the clock for a flat fee. The break-even is one deal you would otherwise have let slip.' },
      { quote: 'Most teams don’t lose clients to competitors. They lose them to their own missed follow-ups.' },
      { h: 'Who this is genuinely a must-have for' },
      {
        list: [
          'Freelancers & solo founders who can’t trade delivery weeks for prospecting weeks',
          'Agencies & studios running outbound across several brands from one console',
          'Startups that need their first hundred conversations, fast',
          'Sales teams who want reps closing, not researching lists',
          'Local & service businesses that live or die on a steady inbound of enquiries',
          'Anyone whose income has ever swung because the pipeline went quiet',
        ],
      },
      { p: 'If new clients matter to what you earn — and for almost everyone, they do — then prospecting was never optional. Doing it by hand was. Klientic is how you keep the pipeline full without giving it your life.' },
      { p: 'Set it up once, point it at your market, and let it hunt. The next quiet week simply doesn’t come.' },
      { cta: true },
    ],
  },

  // ─────────── COMPARISONS ───────────
  {
    slug: 'claude-vs-klientic',
    title: 'Claude vs Klientic: a brilliant assistant vs a client-acquisition engine',
    excerpt: 'Claude writes a beautiful cold email. Klientic finds who to send it to, sends it, chases the follow-ups, triages the replies and books the meeting — while you sleep. Here’s the real difference, with the receipts.',
    date: '2026-07-22',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '9 min',
    category: 'Comparison',
    vs: 'Claude',
    gradient: 'linear-gradient(135deg,#C2410C 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Claude is one of the best writing and reasoning models on earth. Paste in a prospect, ask for a cold email, and what comes back is genuinely good — warm, specific, human. So it’s a fair question: if Claude can write the email, why would you need Klientic at all?' },
      { p: 'Because writing the email was never the hard part. The hard part is everything around it — and there’s a lot of it, most of it invisible until you try to keep it up for a hundred leads across a three-touch cadence, every week, forever.' },
      { p: 'This isn’t a knock on Claude. It’s a category difference. Claude is a brilliant assistant. Klientic is a system. One waits for you; the other works without you.' },
      { h: 'What Claude is genuinely brilliant at' },
      { p: 'Claude reasons, writes, summarises and answers as well as anything available. Give it context and it produces a great first draft of almost anything — including outreach, objection handling and follow-up angles. As a thinking partner it is hard to beat, and we mean that: Klientic is happy to run on it.' },
      { p: 'But Claude waits for you. It has no idea who your next fifty clients are, it never sends anything, it doesn’t remember to follow up on day three, and it will never tell you which reply is worth your time. It’s a genius that only moves when you prompt it — and prompting it, over and over, is a full-time job you didn’t sign up for.' },
      { h: 'The seven jobs a chat window hands back to you' },
      { p: 'Run the honest checklist of what it actually takes to win a client, and watch how much of it a chat window leaves sitting on your desk:' },
      SEVEN_JOBS,
      { p: 'Claude helps with roughly one of those — the drafting. You are still the system holding the other six together: the researcher, the sender, the scheduler, the follow-up chaser, the inbox triager and the booker. That’s where the week goes.' },
      { cta: true },
      { h: 'What Klientic does instead' },
      { p: 'Klientic isn’t a chat window. It’s the machine that runs the whole loop, unattended, and it does it every day rather than when you remember to open a tab.' },
      PRODUCT_STATS,
      KLIENTIC_DOES,
      { p: 'You set it up once per project. It hunts every day after that — sourcing and scoring leads, writing grounded outreach, sending, following up, classifying replies into eleven categories, and booking meetings straight onto your call list.' },
      vsCompare('Claude'),
      ...FIRST_WEEK,
      { h: 'The twist: Klientic runs on Claude' },
      { p: 'Here’s the part that dissolves the whole “versus.” Klientic is bring-your-own-key — plug in your Anthropic API key and Claude becomes the brain inside the machine. You get Claude’s writing quality and the entire acquisition system wrapped around it, at model cost with no markup.' },
      { p: 'So the real choice was never Claude or Klientic. It’s Claude in a chat window, or Claude inside a system that also prospects, sends, follows up and books. One is a great writer. The other is a great writer that also runs your outbound.' },
      { callout: { title: 'Best of both', text: 'A chat window gives you a brilliant model. Klientic gives you a brilliant model that also finds the leads, sends the emails, chases the follow-ups and books the meetings — on autopilot.' } },
      ...OBJECTION,
      MATH,
      { h: 'Who this is a must-have for' },
      { p: 'Freelancers and solo founders who can’t spend their week prospecting instead of delivering. Agencies running outbound for several brands. And any company that only grows when someone remembers to chase — which, if we’re honest, is every company.' },
      { p: 'If new clients matter to your income, the drafting was never your bottleneck. The system was. Keep Claude for the writing. Let Klientic run everything else.' },
      { cta: true },
    ],
  },
  {
    slug: 'chatgpt-vs-klientic',
    title: 'ChatGPT vs Klientic: a chat window vs an outbound machine',
    excerpt: 'Everyone has a ChatGPT tab open. Almost no one has a pipeline that fills itself. The gap between the two is the difference between a tool you operate and a system that operates for you.',
    date: '2026-07-21',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '8 min',
    category: 'Comparison',
    vs: 'ChatGPT',
    gradient: 'linear-gradient(135deg,#0F9D8C 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'ChatGPT is the most familiar AI on the planet. Nearly everyone in sales has a tab open, right now, this second. And yet almost no one’s pipeline is actually growing on autopilot. Why the gap?' },
      { p: 'Because a chat window is a tool you operate. Winning clients needs a system that operates without you. The distance between those two sentences is the distance between a busy day and a full calendar.' },
      { p: 'ChatGPT is superb at what it does. It just doesn’t do the thing that actually fills a pipeline — and no amount of clever prompting changes that.' },
      { h: 'What ChatGPT is great at' },
      { p: 'Brainstorming, rewriting, role-play, summarising a call, drafting a proposal, unblocking you when the words won’t come. As an on-demand assistant it’s excellent, and its ubiquity means everyone already knows how to use it — no learning curve, no onboarding.' },
      { p: 'But that ubiquity is also the trap. When every rep uses the same tool to write the same kind of email, “AI-written” becomes a smell buyers can spot from the subject line. And no matter how good the draft, ChatGPT still can’t find the lead, send the message, or follow up next Tuesday when you’ve forgotten the thread ever existed.' },
      { h: 'A tab you open vs a system that runs' },
      { p: 'The moment you close the tab, ChatGPT stops. It has no memory of your pipeline, no cadence, no inbox, no sense of who replied warmly last week. Every touch is a manual act: you decide, you prompt, you copy, you paste, you send, you remember. Miss a day and the pipeline misses a day. Get busy for a month and the pipeline goes cold for a month.' },
      SEVEN_JOBS,
      { p: 'Every line on that list is a job ChatGPT hands back. Klientic is the opposite — it owns the whole list and runs it whether or not you show up.' },
      PRODUCT_STATS,
      { cta: true },
      { h: 'What Klientic does instead' },
      { p: 'Klientic sources and scores leads for your niche continuously, grounds every message in your knowledge base so it sounds like you rather than a template, sends and chases on schedule per lead, triages every reply into eleven categories, and escalates the human moments to you.' },
      KLIENTIC_DOES,
      vsCompare('ChatGPT'),
      ...FIRST_WEEK,
      { h: 'The twist: Klientic can run on OpenAI' },
      { p: 'You don’t have to choose your model. Klientic is bring-your-own-key and supports OpenAI, Anthropic, Gemini and OpenRouter. Plug in your OpenAI key and GPT powers the writing — inside a system that actually sends, chases and books. Same model you trust, wrapped in the machine you were missing.' },
      { callout: { title: 'Familiar model, real system', text: 'ChatGPT helps you write. Klientic makes sure it gets written, sent, chased and booked — for every lead, every week, without a reminder.' } },
      ...OBJECTION,
      MATH,
      { h: 'Who this is a must-have for' },
      { p: 'Anyone whose income depends on a steady flow of new clients and who can’t afford for prospecting to stop the week they get busy delivering. The teams that win aren’t the ones with the cleverest prompts — they’re the ones whose outbound never sleeps.' },
      { p: 'Keep the ChatGPT tab for what it’s good at. Let Klientic run the pipeline it was never built to.' },
      { cta: true },
    ],
  },
  {
    slug: 'gemini-vs-klientic',
    title: 'Gemini vs Klientic: search-smart AI vs a system that wins clients',
    excerpt: 'Gemini can research a company in seconds. But knowing about a prospect and turning them into a client are two very different jobs — and only one of them fills your calendar.',
    date: '2026-07-20',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '8 min',
    category: 'Comparison',
    vs: 'Gemini',
    gradient: 'linear-gradient(135deg,#2563EB 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Gemini is fast, multimodal and wired into the world’s best search. Ask it about a company and you’ll get a crisp, well-sourced picture in seconds. For research, it’s a genuinely great tool — and research feels like progress.' },
      { p: 'But research is where most outbound quietly dies, not where it wins. Knowing about a prospect and converting one are two different jobs, and the second is the one that pays.' },
      { p: 'That gap — between knowing and doing — is the whole story of why a brilliant research AI still leaves your calendar empty.' },
      { h: 'What Gemini is great at' },
      { p: 'Pulling context, comparing options, digesting long documents, answering with fresh information from across the web. If your question is “tell me about X” or “who are the players in this space,” Gemini is excellent and fast.' },
      { p: 'The trouble is that “tell me about X” isn’t a growth strategy. After the answer arrives, you still have to decide who to contact, write the message, send it, wait, follow up, handle the reply, and book the call. Gemini hands every one of those steps back to you.' },
      { h: 'Knowing vs doing' },
      { p: 'This is the quiet gap in every AI-assisted stack: the model knows, but you still have to do. And the doing is not one action — it’s dozens, repeated across every lead:' },
      SEVEN_JOBS,
      { p: 'Multiply that across hundreds of leads and a three-touch cadence and it is simply more than any person keeps up with by hand. Research alone has never signed a contract.' },
      PRODUCT_STATS,
      { cta: true },
      { h: 'What Klientic does instead' },
      { p: 'Klientic closes the gap by turning knowing into doing, automatically — finding fitting companies and the right decision-maker, scoring each lead, writing and sending grounded outreach, running the 3 / 7 / 21 rhythm, classifying replies, and booking meetings.' },
      KLIENTIC_DOES,
      vsCompare('Gemini'),
      ...FIRST_WEEK,
      { h: 'The twist: Klientic can run on Gemini' },
      { p: 'Love Gemini’s output? Keep it. Klientic is bring-your-own-key and supports Google Gemini alongside OpenAI, Anthropic and OpenRouter. Gemini becomes the intelligence; Klientic becomes the system that acts on it — at model cost, never marked up.' },
      { callout: { title: 'Research → revenue', text: 'Gemini tells you about the market. Klientic goes and wins it — turning what the model knows into contacted, chased and booked conversations.' } },
      ...OBJECTION,
      MATH,
      { h: 'Who this is a must-have for' },
      { p: 'Every individual who sells their time and every company that needs a predictable flow of clients. The teams that grow are the ones that turn research into action — automatically, and without burning a person out doing it by hand.' },
      { p: 'Use Gemini to understand your market. Use Klientic to fill your calendar from it.' },
      { cta: true },
    ],
  },
  {
    slug: 'perplexity-vs-klientic',
    title: 'Perplexity vs Klientic: an answer engine vs a client engine',
    excerpt: 'Perplexity gives you sourced answers. Klientic gives you booked meetings. One ends the moment your question is answered — the other keeps working until your calendar is full.',
    date: '2026-07-18',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '8 min',
    category: 'Comparison',
    vs: 'Perplexity',
    gradient: 'linear-gradient(135deg,#1E3A8A 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Perplexity is a superb answer engine. Ask a question, get a clean, cited response you can trust. For research and fact-finding it has genuinely changed how a lot of us work, and it deserves the hype it gets.' },
      { p: 'But an answer engine ends the moment your question is answered. A client engine keeps going until your calendar is full. That single difference is the whole point of this comparison.' },
      { p: 'Perplexity is brilliant at the first 10% of winning a client. Klientic owns the other 90%.' },
      { h: 'What Perplexity is great at' },
      { p: 'Fast, sourced answers. Market scans. “Who are the top firms in this space.” It’s a brilliant way to understand a landscape in minutes instead of an afternoon of open tabs — and the citations mean you can actually trust what you build on.' },
      { p: 'And then it stops. Perplexity won’t reach out to those firms, won’t write to the decision-maker, won’t follow up, and won’t tell you who replied warmly. The research is done; the selling — the part that pays — hasn’t started.' },
      { h: 'From a list of names to a full calendar' },
      { p: 'Getting a list of promising companies feels like real progress, but it’s the easy part. The hard, unglamorous, deal-making part is the relentless follow-through — the exact seven jobs Perplexity leaves on your desk:' },
      SEVEN_JOBS,
      { p: 'Done by hand, that follow-through is where nearly everyone quits — usually around follow-up number two, right before the replies would have started. That relentlessness is exactly what Klientic automates.' },
      PRODUCT_STATS,
      { cta: true },
      { h: 'What Klientic does instead' },
      { p: 'Klientic turns a niche into a scored, enriched list of real, contactable leads, writes grounded outreach, runs the 3 / 7 / 21 cadence for every lead automatically, classifies replies into eleven categories, and books the meeting.' },
      KLIENTIC_DOES,
      vsCompare('Perplexity'),
      ...FIRST_WEEK,
      { h: 'The twist: bring any brain you like' },
      { p: 'Klientic is model-agnostic and bring-your-own-key — OpenAI, Anthropic, Gemini or OpenRouter. Use whichever engine you trust for the thinking; Klientic supplies the system that turns thinking into booked meetings, at model cost.' },
      { callout: { title: 'Answers vs outcomes', text: 'Perplexity answers your question. Klientic fills your pipeline. One is a tool you consult; the other is an outcome you receive.' } },
      ...OBJECTION,
      MATH,
      { h: 'Who this is a must-have for' },
      { p: 'Any person or company that needs clients and is tired of research that never becomes revenue. If a full calendar matters to you, an answer engine was never going to get you there on its own.' },
      { p: 'Research with Perplexity. Then let Klientic turn that research into meetings while you sleep.' },
      { cta: true },
    ],
  },
  {
    slug: 'hubspot-vs-klientic',
    title: 'HubSpot vs Klientic: a place to store pipeline vs a machine that builds it',
    excerpt: 'A CRM is a filing cabinet for deals you already have. Klientic is the engine that creates them. The two aren’t rivals so much as different halves of the job — and most teams are missing the half that actually finds clients.',
    date: '2026-07-16',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '8 min',
    category: 'Comparison',
    vs: 'HubSpot',
    gradient: 'linear-gradient(135deg,#EA580C 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Ask most teams what they use to “do sales” and they’ll name a CRM. But a CRM doesn’t find you a single client. It’s a beautifully organised record of the pipeline you already built — by hand, somewhere else, before the CRM ever got involved.' },
      { p: 'That “somewhere else” is the expensive gap. It’s where the real work lives, and it’s exactly the part a CRM assumes you’ve already done. Klientic is built to own that gap.' },
      { h: 'What a CRM is for' },
      { p: 'Storing contacts, logging activity, tracking deal stages, reporting on what closed. Essential hygiene — you should absolutely have one. But every one of those tasks assumes the lead already exists and the outreach already happened. The CRM starts where the hard work ends.' },
      { p: 'Which means the most important question a CRM can’t answer is the one that matters most: where does the next deal in this pipeline actually come from?' },
      { h: 'Where the pipeline actually comes from' },
      { p: 'Someone still has to find the companies, get the contacts, write the emails, send them, follow up, and qualify the replies. In a CRM-only world, that “someone” is a human doing manual work between database updates — and their capacity is the ceiling on your growth.' },
      SEVEN_JOBS,
      { p: 'Klientic does that upstream work autonomously — then hands you a warm, qualified conversation to log. It doesn’t replace your CRM; it feeds it.' },
      PRODUCT_STATS,
      { cta: true },
      {
        compare: {
          title: 'CRM vs Klientic',
          them: 'CRM',
          rows: [
            { row: 'Store contacts & deal stages', them: '✓', us: '✓' },
            { row: 'Find new fitting leads for you', them: '✗', us: '✓' },
            { row: 'Write & send the outreach', them: '✗', us: '✓' },
            { row: 'Chase follow-ups automatically', them: 'Templates only', us: '3 / 7 / 21' },
            { row: 'Triage & draft replies', them: '✗', us: '11 categories' },
            { row: 'Score & prioritise leads', them: 'Manual rules', us: 'Automatic' },
            { row: 'Bring your own AI model', them: '✗', us: '✓' },
          ],
        },
      },
      ...FIRST_WEEK,
      { callout: { title: 'They’re better together', text: 'Keep your CRM as the system of record. Let Klientic be the system of growth that keeps it full. One remembers your deals; the other creates them.' } },
      ...OBJECTION,
      MATH,
      { h: 'Who this is a must-have for' },
      { p: 'Any team that has a CRM full of stages but empty of new logos. Storage was never the problem. Supply was — and supply is exactly what Klientic manufactures, every day.' },
      { cta: true },
    ],
  },

  // ─────────── VALUE / USE-CASE ───────────
  {
    slug: 'cost-of-manual-prospecting',
    title: 'The real cost of prospecting by hand (and why it’s more than you think)',
    excerpt: 'Manual outbound doesn’t just cost hours. It costs the deals you never followed up on, the weeks the pipeline went quiet, and the rep salary you spend on copy-paste. Here’s the true bill.',
    date: '2026-07-14',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '7 min',
    category: 'Playbook',
    kicker: 'Manual outbound is the most expensive “free” thing you do.',
    gradient: 'linear-gradient(135deg,#0891B2 0%,#A435E8 55%,#E0457E 100%)',
    body: [
      { p: 'Prospecting by hand feels free because no invoice ever arrives for it. But the bill is real — it just shows up disguised as wasted hours, missed follow-ups and a pipeline that goes quiet at the worst possible moment.' },
      { p: 'Add it up honestly and manual outbound turns out to be one of the most expensive things a business does. You just pay for it in the currencies that don’t show on a P&L.' },
      { h: 'Where the hours actually go' },
      { p: 'Building a list. Hunting for contact details. Researching each company enough to sound relevant. Writing every email from scratch. Logging it. Then — the part almost everyone skips — following up, again and again, on schedule, for every single lead.' },
      {
        stats: [
          { value: 'Most', label: 'of a rep’s week goes to research & admin, not selling' },
          { value: '5+', label: 'touches most deals need before a reply' },
          { value: '#1–2', label: 'where most people quit following up' },
          { value: '0', label: 'of it happens the week you’re slammed' },
        ],
      },
      { p: 'The cruel part: the follow-up is where the deals actually are, and it’s the first thing to fall off when you get busy. So you pay for all the effort up front — the list, the research, the first email — and then abandon it right before it would have paid off.' },
      { cta: true },
      { h: 'The three hidden costs' },
      { p: 'The hours are only the visible cost. Underneath sit three more expensive ones:' },
      {
        list: [
          'The salary cost — a capable person doing copy-paste instead of closing',
          'The opportunity cost — warm leads that die because touch #3 never went out',
          'The volatility cost — feast-or-famine swings that make hiring and planning impossible',
        ],
      },
      { p: 'That third one is the silent killer. A pipeline that swings wildly doesn’t just cost deals — it costs the confidence to invest, hire and grow, because you never quite trust next quarter.' },
      { callout: { title: 'The fix isn’t more discipline', text: 'You will always get busy, and willpower always loses to a deadline. The answer isn’t trying harder — it’s a system that keeps prospecting when you can’t: every lead, every follow-up, every week.' } },
      { h: 'What automation actually buys back' },
      { p: 'Klientic runs the research, writing, sending, follow-up and triage for you, on a 3 / 7 / 21 cadence that never forgets and never gets busy. You get the hours back, the missed deals back, and — most valuable of all — a pipeline that stays level whether or not this week was chaos.' },
      { p: 'You bring your own AI key, so the intelligence runs at cost. One recovered deal usually pays for the year. The only real question is how many you’ve already let slip.' },
      { cta: true },
    ],
  },
  {
    slug: 'klientic-for-freelancers',
    title: 'Klientic for freelancers: never start from zero between projects again',
    excerpt: 'The freelancer’s nightmare isn’t a bad month — it’s the scramble for the next client the moment a project ends. Here’s how to keep a warm pipeline running while you stay heads-down on the work.',
    date: '2026-07-12',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '6 min',
    category: 'Use case',
    kicker: 'Stay heads-down on the work. Let the pipeline fill itself.',
    gradient: 'linear-gradient(135deg,#DB2777 0%,#A435E8 55%,#7C2FD6 100%)',
    body: [
      { p: 'Every freelancer knows the cycle by heart. You’re fully booked, so you stop marketing. The project ends, the calendar empties, and now you’re cold-pitching in a panic instead of delivering great work. Feast, then famine, then repeat — forever.' },
      { p: 'The cycle exists for one simple reason: prospecting and delivering compete for the same hours, and delivery always wins until it’s suddenly, painfully too late.' },
      { h: 'A tireless business developer, for a subscription' },
      { p: 'Klientic breaks the tie. It prospects in the background while you work — finding fitting clients in your niche, writing outreach in your voice, following up so you don’t have to, and dropping warm replies onto your desk when they’re ready to talk.' },
      { p: 'It’s the business-development partner most freelancers can’t justify hiring, running for the price of a subscription instead of a salary.' },
      PRODUCT_STATS,
      { cta: true },
      { h: 'Why it sounds like you, not a bot' },
      { p: 'Every message is grounded in your knowledge base — your services, your case studies, your tone, your prices. So the outreach reads like you wrote it between calls, not like a template blasted to a scraped list. If a detail isn’t true about you, the agent won’t claim it.' },
      { p: 'And when a reply comes in that needs a human touch — a real question, a pricing conversation, a “can we hop on a call” — it’s flagged for you, not auto-answered. You stay the face of your business; the agent just handles the grind behind it.' },
      { callout: { title: 'The freelancer’s dream', text: 'A steady drip of qualified conversations, so you choose your next project instead of chasing it — and never send another panicked cold pitch the week a contract ends.' } },
      { h: 'Set it once, per offer' },
      { p: 'Point it at a niche and a region, feed it your pitch, and let it hunt. When you’re slammed with delivery, it keeps going. When a project wraps, the pipeline is already warm — no cold start, no panic, no gap between the last invoice and the next one.' },
      { p: 'That’s the whole promise: the marketing never stops just because you got busy doing the work.' },
      { cta: true },
    ],
  },
  {
    slug: 'klientic-for-agencies',
    title: 'Klientic for agencies: run outbound for every client from one console',
    excerpt: 'Agencies live and die on new business — their own and their clients’. Multi-project workspaces, per-brand knowledge bases and bring-your-own-key economics make Klientic the agency’s unfair advantage.',
    date: '2026-07-09',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '7 min',
    category: 'Use case',
    kicker: 'One console. Every brand. Outbound that never sleeps.',
    gradient: 'linear-gradient(135deg,#7C3AED 0%,#A435E8 50%,#E0457E 100%)',
    body: [
      { p: 'An agency is really two businesses stacked on top of each other: winning your own clients, and delivering growth for theirs. Both run on the same fuel — a full pipeline — and both are effectively impossible to keep full by hand once you’re juggling more than a couple of brands.' },
      { p: 'The usual answer is to throw people at it: an SDR here, a VA there, a founder doing outreach at midnight. Klientic is the answer that scales without the headcount.' },
      { h: 'Multi-project by design' },
      { p: 'Every brand gets its own project: its own knowledge base, its own niche, its own voice, its own language, its own leads and reports. Switch between them in one console without ever crossing wires or copy-pasting context between tabs and spreadsheets.' },
      { p: 'That isolation matters. Client A’s pitch never leaks into client B’s emails; each project stays perfectly on-brand because it only ever speaks from its own material.' },
      PRODUCT_STATS,
      { cta: true },
      { h: 'The economics agencies love' },
      { p: 'Klientic is bring-your-own-key: plug in one API key and pay model costs at cost, never marked up, across every client project. No per-seat outbound tool quietly inflating every retainer — one flat platform doing the work of a whole prospecting team.' },
      {
        compare: {
          title: 'Manual agency ops vs Klientic',
          them: 'By hand',
          rows: [
            { row: 'Outbound for 5+ brands at once', them: 'A whole team', us: 'One console' },
            { row: 'Per-brand voice & knowledge', them: 'Spreadsheets', us: 'Built in' },
            { row: 'Follow-ups that never slip', them: '✗', us: '3 / 7 / 21' },
            { row: 'Reporting per client', them: 'Manual', us: 'Automatic' },
            { row: 'Cost to add another brand', them: 'Another hire', us: 'Another project' },
          ],
        },
      },
      ...FIRST_WEEK,
      { callout: { title: 'Your unfair advantage', text: 'Show a prospect a pipeline that fills itself — then run it for them. That’s a retainer that renews, and a case study that sells the next one.' } },
      ...OBJECTION,
      { cta: true },
    ],
  },
  {
    slug: 'bring-your-own-ai-key',
    title: 'Bring your own AI key: why paying model costs at cost changes everything',
    excerpt: 'Most AI tools mark up the model and lock you into it. Klientic does the opposite — you bring your own key, choose your model, and pay the provider directly. Here’s why that’s a fairer, cheaper, future-proof deal.',
    date: '2026-07-06',
    author: 'The Klientic Team',
    role: 'Engineering',
    readTime: '6 min',
    category: 'Engineering',
    kicker: 'Your keys. Your model. At cost, never marked up.',
    gradient: 'linear-gradient(135deg,#0D9488 0%,#2563EB 50%,#A435E8 100%)',
    body: [
      { p: 'Most AI products hide the model behind their own bill. You pay their price, use their choice of model, and have no real idea what the intelligence actually costs — or how much margin is stacked on top of it. Klientic is built the other way around, on purpose.' },
      { p: 'We charge for the system that finds and books clients. We don’t charge you a markup on every token the model generates. Those are two very different businesses, and only one of them is fair to you.' },
      { h: 'How bring-your-own-key works' },
      { p: 'You add your own API key — OpenAI, Anthropic, Gemini or OpenRouter — and Klientic uses it directly. The provider bills you at cost. Klientic charges a flat platform fee for the engine around the model, not a per-token cut.' },
      {
        list: [
          'Choose the best model for the job — and switch any time, in a click',
          'Pay the provider directly, at cost, with no middleman margin',
          'Never get locked into one vendor’s pricing or roadmap',
          'Keep control of your own usage, rate limits and data',
        ],
      },
      { cta: true },
      { h: 'Why it’s cheaper than it looks' },
      { p: 'Marked-up AI tools feel simple — one bill — until you scale. Then the markup compounds on every email, every follow-up, every reply drafted, across every lead. Paying at cost means your bill tracks reality instead of someone else’s margin, and the savings grow exactly as your volume does.' },
      { h: 'Why it’s future-proof' },
      { p: 'Models get better and cheaper every few months. When a new one lands, you just point your key at it — no waiting for a vendor to “add support,” no re-platforming, no migration project. The system stays; the brain upgrades underneath it whenever you want.' },
      { callout: { title: 'Fair by design', text: 'You pay for the engine that finds and books clients. You pay the model maker for the model. No one in the middle takes a cut of your intelligence.' } },
      { p: 'It’s a small architectural decision with a big consequence: your costs stay honest, your options stay open, and your tool never becomes obsolete the moment the next great model ships.' },
      { cta: true },
    ],
  },

  // ─────────── EXISTING (kept & enriched) ───────────
  {
    slug: 'ai-is-not-the-salesperson',
    title: 'The AI is not the salesperson — it’s the leverage',
    excerpt: 'The best outbound teams don’t replace humans with AI. They put AI underneath humans, and let it do everything except the closing.',
    date: '2026-07-04',
    author: 'The Klientic Team',
    role: 'Product',
    readTime: '6 min',
    category: 'Philosophy',
    gradient: 'linear-gradient(135deg,#A435E8,#E0457E)',
    body: [
      { p: 'There’s a tempting fantasy in sales software right now: point an AI at a market and let it close deals while you sleep. It doesn’t work, and it shouldn’t. Relationships are still human, and the moment a buyer senses they’re being closed by a robot, the deal is gone.' },
      { p: 'So the useful question isn’t “can AI replace the salesperson?” It’s “what should AI do so the salesperson can do more of what only they can?”' },
      { h: 'Where AI actually wins' },
      { p: 'Research, list-building, first-draft outreach, follow-up discipline, inbox triage and call prep. These are the tasks that quietly eat a rep’s week — repetitive, tireless, easy to postpone — and they are exactly where an agent creates leverage instead of risk.' },
      { p: 'When you remove that load, your salespeople spend their hours on the 5% of the funnel that genuinely needs a human: the nuanced conversation, the negotiation, the read on whether this is really a fit, the trust.' },
      PRODUCT_STATS,
      { callout: { title: 'The rule we build around', text: 'The AI drafts, the human decides. On anything involving pricing, contracts or strategy, the agent stops and hands off — which keeps outbound fast without ever feeling automated.' } },
      { p: 'That single rule is why Klientic feels like leverage, not automation. The person on the other end always meets a human at the moment that matters — they just meet them faster, better-prepared, and after a follow-up that a manual process would have dropped.' },
      { cta: true },
    ],
  },
  {
    slug: 'follow-up-cadence-that-converts',
    title: 'The follow-up cadence that actually converts',
    excerpt: 'Most deals are lost in the gap between the first email and the third. Here’s the 3 / 7 / 21 rhythm and why it works.',
    date: '2026-06-28',
    author: 'The Klientic Team',
    role: 'Growth',
    readTime: '5 min',
    category: 'Playbook',
    gradient: 'linear-gradient(135deg,#2563EB,#A435E8)',
    body: [
      { p: 'A single cold email has a reply rate you can round to zero. The magic is in the follow-up — but only if it stays human, and only if it actually happens. Most of the time, it doesn’t.' },
      { p: 'The deals aren’t lost to a competitor. They’re lost in the silence between email one and the follow-up that never went out.' },
      { h: 'Why 3 / 7 / 21' },
      { p: 'Three days is enough to escape the inbox pile without feeling pushy. Seven days catches the “meant to reply” crowd who genuinely intended to respond and got buried. Twenty-one days is the polite last knock that reactivates a surprising number of dormant threads — the ones you’d have written off.' },
      {
        stats: [
          { value: '3', label: 'days — escape the inbox pile' },
          { value: '7', label: 'days — catch the “meant to reply”' },
          { value: '21', label: 'days — the polite last knock' },
        ],
      },
      { h: 'The catch' },
      { p: 'Each touch must add a new angle, never just “bumping this up.” Klientic references the prior note lightly and brings one fresh, relevant reason to talk — which is why, done right, the third email often outperforms the first.' },
      { callout: { title: 'The part humans drop', text: 'Nobody forgets to send the first email. Everybody forgets the third. Klientic runs the whole cadence for every lead, so the touches that actually convert never slip.' } },
      { cta: true },
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
      { p: 'The fastest way to lose a prospect is to claim something about your product that isn’t true. With generative models, that risk is real — one confident, invented sentence and the trust is gone before the reader reaches your call-to-action.' },
      { p: 'So the whole design question for outbound AI is not “how do we make it sound smart?” It’s “how do we make sure it never lies?”' },
      { h: 'Knowledge base as the source of truth' },
      { p: 'Every project has its own repository: pitch, pricing, FAQs, objection handling, case studies. When the agent writes or replies, that material is the only ground it stands on. If a fact isn’t there, it won’t assert it — full stop.' },
      { p: 'That constraint is a feature, not a limitation. It means the outreach is not just fluent, it’s accountable to something — the same source of truth a good employee would check before hitting send.' },
      { callout: { title: 'Grounded, not guessed', text: 'Outreach that sounds like it was written by someone who works at your company — because, functionally, it was. You feed it the truth; it does the typing.' } },
      { p: 'The result is outreach you can actually send at volume without reading every word in fear. Confidence at scale — that’s the entire point, and it’s only possible when the model is grounded.' },
      { cta: true },
    ],
  },
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
