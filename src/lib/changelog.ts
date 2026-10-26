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
    version: '1.3.5',
    date: '2026-10-26',
    title: 'Mail that is not a reply goes to the project of the address it was sent to',
    tag: 'improvement',
    notes: [
      'Email that is not about a lead — an account verification, a newsletter, a supplier — now lands in the project that sends from the address it arrived at, instead of the first project. Mail to albin@famies.app goes to OutReach PR, because OutReach PR sends from albin@famies.app. "Sort replies" moves what already arrived.',
      'Sorting replies only brings along the answers you wrote after their reply — older emails to the same address stay where they are.',
    ],
  },
  {
    version: '1.3.4',
    date: '2026-10-24',
    title: 'Forwarder confirmations in the Inbox · clickable links',
    tag: 'improvement',
    notes: [
      'When you forward a mailbox to Klientic, the provider (Hostinger, Gmail …) sends a "confirm your forwarder" email. It now lands in the Inbox instead of being filtered out, so you can open it and click the link — no Resend dashboard needed to add a new sender.',
      'Web links in received emails are clickable in the conversation view.',
    ],
  },
  {
    version: '1.3.3',
    date: '2026-10-22',
    title: 'Email check on import · bounces and spam complaints stop follow-ups',
    tag: 'feature',
    notes: [
      'Import list now checks every email first (on by default): fake and placeholder addresses (test@, example.com, your.email@…), throw-away mailboxes, typos like company.con and domains that do not exist or cannot receive email are removed. Typos of the big providers are fixed (gmial.com → gmail.com). A row with a bad email is still imported when it has a phone. The result shows what was removed and fixed.',
      'Find with AI and Add lead run the same check, so guessed or mistyped addresses never reach the pipeline.',
      'When an email bounces or the receiver marks it as spam, Klientic now acts on it: spam complaint or bounce without a phone → the lead moves to Disqualified and follow-ups stop; bounce with a phone → the lead stays for calling but is never emailed again. Drip emails still waiting for that lead are cancelled.',
      'Every send (automated follow-ups, Outreach, bulk / drip, Write email) refuses addresses that bounced or complained, and automated follow-ups ask Resend how the previous email went before sending the next one.',
      'Leads → new "Bounced" filter, and a red bounced / spam mark next to the address; the conversation shows "bounced" or "marked as spam" on the email. Giving the lead a new primary email clears it.',
      'Big imports go in chunks of 1,000 with a progress counter.',
    ],
  },
  {
    version: '1.3.2',
    date: '2026-10-19',
    title: 'Sorting replies also moves your answers',
    tag: 'fix',
    notes: [
      'When a reply is moved to its own project, the answers you wrote from the wrong Inbox move with it, so the whole conversation is in one place.',
      'A reply from someone you once answered from the wrong project now still goes to their lead\'s project (charlotta@… → All Cities).',
    ],
  },
  {
    version: '1.3.1',
    date: '2026-10-19',
    title: 'Replies land in the right project · newest message first',
    tag: 'fix',
    notes: [
      'Replies now go to the Inbox of the project they answer — Hotels to Hotels, Cities to Cities, Socialt engagemang to Socialt engagemang. Before, a reply only matched when it came from exactly the address we wrote to; anything else (malin@sater.se answering mail sent to kommun@sater.se) fell into the first project.',
      'Klientic now matches a reply on the address, the email we sent to it, a lead address quoted in the reply, the organisation domain (never gmail/outlook) and the subject — and links it to the lead when it is clear.',
      'Replies that already landed in the wrong project are moved automatically when you open the Inbox; "Sort replies" runs it again any time. Nothing is deleted.',
      'Conversations open on the newest message (switch to "Oldest first" if you like). The earlier emails quoted inside a reply are folded under "Show earlier messages", so you see what they actually wrote.',
      'The same email stored twice (a reply that arrived and was also logged by hand, a double send, two forwarded copies) is shown once with a ×2 mark, and the same reply arriving twice is no longer saved twice.',
      'Pipeline cards in the Inbox are ordered by latest activity — leads that just replied or were just emailed come first.',
      '"Link to a lead" searches every project and moves the conversation to that lead\'s project. "Log a reply" works again.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-15',
    title: 'Up to 5,000 leads per project',
    tag: 'improvement',
    notes: [
      'A project now holds and shows up to 5,000 leads. Before, lists stopped at 1,000 because the database hands out 1,000 rows at a time — Leads, Companies, Inbox, Follow-ups, Meetings, Dashboard, Tasks, Reports and exports now read every page.',
      'Import list accepts up to 5,000 rows in one file, and duplicate checks look at every lead in the project, not just the first 1,000.',
      'Outreach and the inbox now load up to 10,000 emails instead of 1,000 / 5,000.',
      'When a project reaches 5,000 leads, Import and Find with AI say so clearly instead of failing silently.',
    ],
  },
  {
    version: '1.2.10',
    date: '2026-10-15',
    title: 'Phone-only leads',
    tag: 'feature',
    notes: [
      'Leads no longer need an email — a phone number is enough. Find with AI also keeps organisations that only list a phone (untick the option to get email-only leads as before), Import list keeps rows with an email or a phone, and Add lead accepts either.',
      'New "Phone only" filter on the Leads page with a live count: everyone you can call but not email. Export works on it too.',
      'Duplicates are caught on phone numbers as well, so the same company is not imported twice with a different number format.',
    ],
  },
  {
    version: '1.2.9',
    date: '2026-10-09',
    title: 'Choose the address meeting invites come from',
    tag: 'improvement',
    notes: [
      'Settings → Meetings has "Send invitations from": pick the address leads should see as the meeting organiser. Every Book meeting dialog starts with it (you can still change it per meeting).',
    ],
  },
  {
    version: '1.2.8',
    date: '2026-10-08',
    title: 'Book meetings in Klientic — Teams + Google Calendar',
    tag: 'feature',
    notes: [
      'Book meeting on every lead: from the 📅 button on cards, any ⋯ menu, the conversation and lead drawers, or right after a call with "Meeting booked". Pick date, time and length; your Teams room link is filled in.',
      'The lead gets a real calendar invitation (Gmail / Outlook show Accept · Decline) with a Join Teams button. A copy goes to your Google Calendar address so it appears in Google Calendar and on the iPhone. Reschedule sends an update, cancel removes it from their calendar.',
      'Accepted / declined replies are picked up automatically and shown on the meeting.',
      'Send booking link: one click emails your Google Calendar booking page so the lead picks a free time. Compose has a Booking link button and Send to a list a {{booking_link}} placeholder. If they book that way, log it with "Book meeting" and untick the invite.',
      'New Meetings page: upcoming, past and cancelled meetings with Join, Add to Google Calendar and Reschedule. The dashboard shows the next meetings first, and a prep task lands in Today\'s tasks the day before.',
      'Settings → Meetings: per salesperson booking link, Teams room link and Google Calendar address, plus time zone and default length.',
    ],
  },
  {
    version: '1.2.7',
    date: '2026-10-07',
    title: 'Sending an email moves the follow-up one week ahead',
    tag: 'fix',
    notes: [
      'Emailing a lead that is in Outreach sent or Follow-up (from the Email button, Compose, a reply in the conversation, or Send to a list) now moves it to Follow-up with the next action set to one week later, counts the attempt, and re-dates its call task. The row shows "Last: ✉️ Email · today · subject" right away instead of staying Overdue.',
      'New leads keep the old behaviour: first email → Outreach sent, with the agent\'s follow-up date only when you tick it.',
    ],
  },
  {
    version: '1.2.6',
    date: '2026-10-07',
    title: 'Follow-up queue in pages',
    tag: 'improvement',
    notes: [
      'The Follow-up list (Follow-ups page and the inbox Follow-up stage) is paged like Outreach: choose 10, 25, 50 or 100 per page and jump with Prev / 1 2 3 / Next instead of scrolling through hundreds of rows. Your page size is remembered.',
    ],
  },
  {
    version: '1.2.5',
    date: '2026-10-07',
    title: 'Log notes, calls and emails from every view',
    tag: 'feature',
    notes: [
      'Every three-dot menu — inbox rows and cards, follow-up rows, the leads table, companies, the lead drawer and the conversation drawer — now has Call, Log a note, Log an email and Edit primary contact. Notes are timestamped with who wrote them; logged emails (sent from Outlook, received by phone…) join the conversation history.',
      'The lead drawer has a History tab: every note, call, email, contact change and owner change in order.',
      'Fixed: the Primary contact and Call result popups opened inside the card, so the Save button could hide behind another card. All popups and drawers now open on top of the page.',
      'Log a reply: pick the lead with a proper search (company, contact, email, website) instead of a long dropdown.',
    ],
  },
  {
    version: '1.2.4',
    date: '2026-10-06',
    title: 'No more browser popups & a light-mode hero',
    tag: 'improvement',
    notes: [
      'Every "klientic.com says…" browser popup is gone. Deleting a project or lead and removing an API key now use Klientic\'s own confirmation dialog, which names what you are deleting and what goes with it.',
      'The email editor asks for link, image and table details in a proper dialog instead of the browser prompt.',
      'The dashboard, Autopilot and Affiliate hero banners are white-to-lavender with dark text in light mode. Dark mode keeps the deep plum look.',
    ],
  },
  {
    version: '1.2.3',
    date: '2026-10-06',
    title: 'Cleaner NEXT dates',
    tag: 'fix',
    notes: [
      'The NEXT / OVERDUE line shows just the day ("Call 8 Oct") unless the salesperson picked a specific time. Automated follow-up sequences no longer show odd clock times like 11:57 PM.',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-10-06',
    title: 'Call → result → next step: the salesperson workflow',
    tag: 'feature',
    notes: [
      'Stage 2 is now "Outreach sent": we emailed them, now call or email again. Follow-up is one stage — the system counts attempts ("Follow-up · Attempt 2"), nobody picks Follow-up 1/2/3 by hand.',
      'New lead card front: owner initials (click to assign a salesperson), decision maker or "No decision maker yet", primary email with a pencil to replace the general address (the old one is kept in the history and all future emails go to the new one), phone, last action, and a NEXT line.',
      'CALL button on every card and follow-up row: opens the dialer, logs date, time and salesperson, then asks for the result — Meeting booked, Got contact details (saves the decision maker on the spot), Call again, No answer, Not interested — plus a short note. Call again / No answer / Got contact need a follow-up date (3 working days suggested, editable) and create the call task for that day. Meeting booked → Meeting booked, Not interested → Disqualified.',
      'Follow-up list is a work queue: Overdue (red), Today (orange), Upcoming filters, sorted oldest first, with decision maker, email + phone, last action, NEXT, owner, and Call / Email / ••• on every row. Change the next date from the menu.',
      'Today\'s tasks groups by Overdue / Today / Upcoming, shows the scheduled calls with Call and Log result buttons, and Rebuild no longer wipes them.',
      'Replying to an Outreach-sent lead moves it to Follow-up with the next touch planned. A reply from an unknown address can be linked to a lead from the conversation — that address becomes the primary email.',
      'One-time database update: run supabase/migrations/20261006_lead_data.sql in Supabase → SQL Editor (adds leads.data). Until then, saving a call result or primary contact shows a reminder.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-10-05',
    title: 'Follow-ups box really starts unticked',
    tag: 'fix',
    notes: [
      'Send to a list re-ticked "Let the agent run automated follow-ups" every time the dialog opened. It now opens unticked, and the drip-feed choice resets between sends.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-05',
    title: 'Drip feed sending',
    tag: 'feature',
    notes: [
      'Send to a list has a new "Drip feed" button next to "Send to N". Pick every 3, 5, 10, 15 or 30 minutes and the emails go out one at a time at that pace — the first one now, the rest on schedule. Resend holds and sends them, so you can close Klientic.',
      'Scheduled emails show in Outreach with a "Scheduled · every N min" tag, the time each one goes out, a Scheduled filter and a Scheduled counter. Delete a scheduled email to cancel it before it is sent (stops the drip for that recipient).',
      'Leads in a drip are marked Contacted right away, but their last-contact time and any follow-up are based on when their email actually goes out.',
      '"Let the agent run automated follow-ups" is now off by default when you send to a list — tick it when you want the agent to chase replies.',
    ],
  },
  {
    version: '1.1.10',
    date: '2026-10-05',
    title: 'Menus that stay on top & an "All emails" account filter',
    tag: 'fix',
    notes: [
      'Three-dot menus no longer disappear behind neighbouring cards or rows. They float above everything, flip upwards near the bottom of the screen, and close with Escape or a click outside.',
      'Menu items have a clear purple hover (red for Delete), readable in light and dark mode.',
      'New account filter left of the date range in Inbox and Outreach: "All emails" by default, then every sending address on your account. Pick one to see only the mail sent from that address and the replies it received — tiles, conversations, pipeline counts, health and exports all follow it. Addresses found in older history are listed too.',
    ],
  },
  {
    version: '1.1.9',
    date: '2026-10-05',
    title: 'Light-mode sidebar',
    tag: 'improvement',
    notes: [
      'In light mode the sidebar is now white with a soft lavender fade, a hairline edge and dark text, so it belongs with the rest of the light interface. The active item gets a purple pill and the gradient marker.',
      'Dark mode keeps the deep plum sidebar exactly as before. Switching themes recolours the sidebar instantly.',
    ],
  },
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
