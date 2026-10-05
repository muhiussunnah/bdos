/**
 * Product changelog + a rolling semantic-version scheme.
 *
 * Each version segment counts 0 → 10 (inclusive), then carries into the next:
 *   1.0.0 → 1.0.1 → … → 1.0.10 → 1.1.0 → … → 1.1.10 → 1.2.0 → …
 *   … → 1.10.10 → 2.0.0
 * So a segment never shows "11"; it rolls over at 10.
 */

export const VERSION_MAX = 10;

export function nextVersion(v: string): string {
  const [maj, min, pat] = v.split('.').map((n) => parseInt(n, 10) || 0);
  if (pat < VERSION_MAX) return `${maj}.${min}.${pat + 1}`;
  if (min < VERSION_MAX) return `${maj}.${min + 1}.0`;
  return `${maj + 1}.0.0`;
}

export interface ChangeEntry {
  version: string;
  date: string; // ISO date
  title: string;
  tag: 'feature' | 'improvement' | 'fix' | 'infra';
  notes: string[];
}

/** Newest first. Versions follow the rolling scheme above. */
export const CHANGELOG: ChangeEntry[] = [
  {
    version: '1.1.8',
    date: '2026-10-05',
    title: 'A pipeline that feels alive',
    tag: 'improvement',
    notes: [
      'Inbox is now two clear sections: "Sales pipeline" (stages 1–7 in one row) and "Conversations" (8. Inbox, 9. Waiting for answer, plus a Pipeline health card with reply, meeting and win rates).',
      'Stage tiles got a full redesign: gradient tint with a soft glow, numbered badge, counts that count up, hover lift, and an underline on the active stage. The same tiles power the dashboard.',
      'A distribution bar under the stages shows how your leads split across the pipeline, on the dashboard and in the inbox.',
      'Conversation tiles show live context: new replies in the last 24h, how many are your turn, and the longest-waiting reply with a pulsing dot.',
      'Conversation rows and lead cards have company avatars, a who-wrote-last badge, hover states and a gentle staggered entrance. Everything respects reduced-motion settings.',
    ],
  },
  {
    version: '1.1.7',
    date: '2026-10-05',
    title: 'Phone column, date filters & filter-wise export everywhere',
    tag: 'feature',
    notes: [
      'Leads table: Location now sits under Industry, and the freed column shows the Phone number directly — tap to call. Sort by phone too.',
      'Companies: Phone and Email are full columns (tap to call / click to mail), plus Added date and pagination.',
      'Every list has a date range: All time, Last 7 days, Last 30 days, This year, Last year, or Custom (from–to). Leads and Companies filter by the date the lead was added; Outreach by send date; Inbox by last activity. Your choice is remembered per page.',
      'Export CSV on Leads, Companies, Outreach and every Inbox stage. The file contains exactly what you filtered (stage, search, date range) across all pages, with a count on the button. Leads export includes phone, email, stage, scores, tags, dates and notes; Inbox conversations export the last message and whose turn it is.',
    ],
  },
  {
    version: '1.1.6',
    date: '2026-10-05',
    title: 'Stage names never cut off',
    tag: 'fix',
    notes: [
      'Pipeline tiles on the dashboard and in the inbox wrap long names like "Meeting booked" and "Waiting for answer" onto two lines instead of truncating them. Counts stay aligned across the row.',
    ],
  },
  {
    version: '1.1.5',
    date: '2026-10-05',
    title: 'Cleaner dashboard & inbox — one set of numbers',
    tag: 'improvement',
    notes: [
      'Inbox: the "First outreach" tile is gone — it duplicated 2. Contacted. The inbox now shows exactly 1–7 pipeline stages plus 8. Inbox and 9. Waiting for answer. Every sent email is still in each conversation (History) and in the Outreach section.',
      'Dashboard: the five metric tiles under the pipeline (In pipeline, Contacted, Positive, Emails sent, Needs action) are removed. The Sales pipeline card is now the single source of counts, so the same numbers appear on the dashboard, in the inbox and on the leads page.',
      'About "Positive": that tile summed Active deal + Meeting booked + Won, which is why it could show 16 while Active deal showed 0. Nothing was lost — those leads are in 4. Meeting booked and 6. Won. Active deal fills when a reply is classified positive/interested, or when you choose "Mark as active deal".',
    ],
  },
  {
    version: '1.1.4',
    date: '2026-10-05',
    title: 'New dashboard & one sales pipeline everywhere',
    tag: 'feature',
    notes: [
      'Dashboard redesign: a greeting banner with today\'s calls and follow-ups, "Add new lead" and "View report" buttons, and a Sales pipeline card with seven numbered stages — 1. Lead, 2. Contacted, 3. Follow-up, 4. Meeting booked, 5. Active deal, 6. Won, 7. Disqualified. Click any stage to open exactly those leads.',
      'Topbar now has both "Find leads" (AI search) and "Add lead" (manual) — both open the Leads section directly.',
      'Inbox uses the same seven stages first, then 8. Inbox, 9. Waiting for answer and 10. First outreach. Your last selected stage is remembered.',
      'Every three-dot menu and the conversation drawer offer "Mark as contacted / follow-up / meeting booked / active deal / won / disqualified" — the same words as the cards. The current stage is hidden from the list.',
      'Stage labels match everywhere: Active deal, Meeting booked, Won and Disqualified replace Positive, Meeting, Closed and Lost in tables, drawers and bulk moves.',
      'Leads page accepts ?stage=… deep links from the dashboard and shows the active stage as a chip you can clear. New-lead cards in the inbox have a "Write email" shortcut.',
    ],
  },
  {
    version: '1.1.3',
    date: '2026-10-01',
    title: 'No accidental double emails',
    tag: 'improvement',
    notes: [
      'Sending to a lead from the New tab now always moves it to Contacted — even with automated follow-ups switched off — so the New list shrinks with every send. Leads emailed earlier that were stuck in New are repaired automatically.',
      'Send to a list has a Contacted tab: everyone you already emailed, with how many emails went out, when, and the last subject. Every tab shows its count.',
      'Ticking someone you already emailed (or Select all over such leads) opens a warning with the full history of what was sent — click any email to read it. "Confirm to Start Send New Message" is the explicit go-ahead for a fresh offer; Cancel skips them.',
      'The same check runs right before sending (CSV lists included) and in Compose.',
    ],
  },
  {
    version: '1.1.2',
    date: '2026-09-23',
    title: 'Delete anywhere, call from follow-ups, history on every card',
    tag: 'improvement',
    notes: [
      'Every three-dot menu in the pipeline now has "Delete lead" (with confirmation), and the conversation drawer has a delete button too.',
      'Follow-up rows show the phone number as a tap-to-call link, plus a clickable email.',
      'Booked meeting and To sale cards open the full conversation history by default — first message to latest, with a reply box. "History" and "Open lead details" are in the menu.',
      'Cards show how many messages were exchanged and how many came from the lead.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-09-22',
    title: 'Conversations, date filters & captured replies',
    tag: 'feature',
    notes: [
      'New "Inbox" stage: only conversations where the lead has actually replied. "Waiting for answer" now means it is your turn — once you reply it moves out automatically.',
      'Click any email to open the whole conversation, first message to latest, Gmail-style, with a reply box and booked / follow-up / sold buttons.',
      'Date range on every stage: last 7 days, last 30 days, this year, last year, lifetime (remembered).',
      'Subject field suggests the last 3 subjects you used.',
      'Replies to your famies.app / fammap.app mailboxes are forwarded into Klientic, so they land in the pipeline automatically.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-17',
    title: 'Inbox pipeline, Follow-ups & Changelog',
    tag: 'feature',
    notes: [
      'Inbox is now a 5-stage pipeline: First outreach → Waiting for answer → Booked meeting → Follow-up → To sale.',
      'First outreach shows every sent email; open one to read it like a mail client.',
      'Move any conversation with the three-dot menu: mark as booked meeting, follow-up or sold.',
      'New dedicated Follow-ups section in the sidebar with one-click "run all due follow-ups".',
      'This changelog, with an in-app version shown in the sidebar.',
    ],
  },
  {
    version: '1.0.10',
    date: '2026-09-07',
    title: 'Signed-in marketing header',
    tag: 'improvement',
    notes: [
      'Visiting the public site while logged in now shows your avatar and a Dashboard button instead of Log in / Start free.',
      'Hero call-to-actions turn into "Go to your dashboard".',
    ],
  },
  {
    version: '1.0.9',
    date: '2026-09-07',
    title: 'Roomier tables',
    tag: 'improvement',
    notes: [
      'Wider app canvas so lists use the whole screen.',
      'Leads table tightened — company, industry and contact columns are compact so the email column has room.',
    ],
  },
  {
    version: '1.0.8',
    date: '2026-09-07',
    title: 'Email required for every lead',
    tag: 'improvement',
    notes: [
      'AI discovery only adds organisations with a real contact email — no email, no lead.',
      'Manual add requires an email; CSV import skips rows without one by default.',
      'Dedicated Email column in the leads table.',
    ],
  },
  {
    version: '1.0.7',
    date: '2026-09-07',
    title: 'Multiple sender addresses',
    tag: 'feature',
    notes: [
      'Add several from-addresses, mark one default, and pick any when composing or sending to a list.',
      'Replies are answered from the address that received them.',
    ],
  },
  {
    version: '1.0.6',
    date: '2026-09-04',
    title: 'Editor font sizing',
    tag: 'improvement',
    notes: [
      'Font-size box with presets (10–48px) and a custom value, plus a Select-all button in the email editor.',
    ],
  },
  {
    version: '1.0.5',
    date: '2026-09-04',
    title: 'Rich-text email editor',
    tag: 'feature',
    notes: [
      'Compose and list sends now use a full rich-text editor: headings, bold/italic/underline, lists, alignment, quotes, code, tables, links and image upload, with an HTML view.',
      'API-key fields in Settings gained reveal, copy and remove controls.',
    ],
  },
  {
    version: '1.0.4',
    date: '2026-09-04',
    title: 'List management',
    tag: 'improvement',
    notes: [
      'Row selection with select-all, bulk delete and bulk stage / handled actions.',
      'Per-row delete, column sorting, and 10/25/50/100 pagination on Leads, Outreach and Inbox.',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-09-04',
    title: 'Automatic reply capture',
    tag: 'feature',
    notes: [
      'Replies to your sending address arrive in the Inbox automatically via the Resend inbound webhook, linked to the lead and classified by the agent.',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-09-04',
    title: 'Manual outreach',
    tag: 'feature',
    notes: [
      'Import your own lead list from CSV with automatic column mapping.',
      'A Gmail-style composer and a bulk sender for lists, with {{placeholders}} and attachments.',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-09-04',
    title: 'Reliability',
    tag: 'infra',
    notes: [
      'Daily keep-alive so the backend never idles out.',
      'Clearer sign-in error when the network is unreachable.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-25',
    title: 'Klientic launch',
    tag: 'feature',
    notes: [
      'Multi-project workspaces, AI lead discovery, outreach, automated follow-ups, inbox triage, tasks and daily reports.',
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;
