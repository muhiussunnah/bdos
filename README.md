# BDOS — Business Development Operating System

An AI-powered platform that researches prospects, qualifies leads, writes human outreach,
manages follow-ups, triages replies, and prepares your sales team — across as many projects
and businesses as you run.

> The AI is not the salesperson. It is the research assistant, SDR, outreach coordinator,
> follow-up manager and inbox assistant. Your team closes.

## Features

- **Multi-project workspaces** — isolated knowledge base, leads, voice and outreach language per business.
- **Lead discovery agent** — find fitting organisations, auto-scored on Fit & Opportunity (A/B/C priority).
- **Outreach engine** — personal, human-sounding email, written in each project's language.
- **Follow-up engine** — automatic 3 / 7 / 21-day cadence (configurable per project).
- **Inbox intelligence** — every reply auto-classified; safe replies drafted, sensitive ones flagged for a human.
- **Sales-manager call list** — a prioritized daily task list built from the live pipeline.
- **Meeting prep** — company summary, talking points and objections in under 60 seconds.
- **Daily reports** — the numbers plus the agent's read on today's top opportunities.
- **Knowledge base** — ground the agent on your pitch, pricing and scripts; it never invents beyond them.
- **Bring your own AI** — OpenAI, Anthropic, Google Gemini or OpenRouter; each user adds their own keys.
- **Admin console** — platform-wide overview, user management and project oversight.

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Supabase** — Postgres, Auth and Row-Level Security
- **Resend** — outbound email
- **Tailwind CSS** — design system
- **Cloudflare Pages** — hosting (edge runtime)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy the URL, anon key and service-role key into `.env.local`.
4. Make yourself admin — run once in the SQL editor:
   ```sql
   update public.profiles set is_admin = true where lower(email) = 'you@example.com';
   ```
   (Also set `NEXT_PUBLIC_ADMIN_EMAIL` so the `/admin` console unlocks immediately.)

### 2. AI providers & email

Users add their own keys in **Settings → AI Providers** and **Settings → Email** (Resend).
You can optionally set platform-wide fallback keys in `.env.local`.

## Deploy to Cloudflare Pages

```bash
npm run deploy
```

Set the same environment variables in the Cloudflare Pages dashboard. To make follow-ups and
reports fully hands-free, add a **Cron Trigger** that calls `/api/followups/run` and
`/api/reports/daily` each morning.

## Project structure

```
src/
  app/
    (app)/        authenticated workspace (dashboard, leads, outreach, inbox, …)
    admin/        super-admin console
    api/          server routes (discovery, outreach, inbox, reports, …)
    login/        authentication
  components/     shell, sidebar, drawers, UI primitives
  lib/
    ai/           provider abstraction + prompt builders
    email/        Resend integration
    supabase/     browser + server clients, middleware
supabase/
  schema.sql      full database schema with RLS
```

## License

Proprietary. All rights reserved.
