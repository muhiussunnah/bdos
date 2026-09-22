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
