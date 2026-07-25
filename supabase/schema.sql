-- ============================================================================
-- BDOS — full database schema (run once in Supabase → SQL Editor)
-- Multi-project business-development OS. Every row is owner-scoped via RLS.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type lead_priority as enum ('A','B','C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_stage as enum
    ('new','contacted','followup1','followup2','followup3','positive','meeting','closed','lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type msg_direction as enum ('outbound','inbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type msg_status as enum ('draft','scheduled','sent','failed','received');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reply_category as enum
    ('positive','interested','wants_info','meeting_request','referral',
     'not_interested','unsubscribe','objection','pricing','partnership','human_review');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  avatar_url   text,
  is_admin     boolean not null default false,
  plan         text not null default 'trial',
  blocked      boolean not null default false,
  block_message text,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ── projects (the multi-project core) ───────────────────────────────────────
create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  color               text not null default '#A435E8',
  company_info        text,
  website             text,
  product_description text,
  sales_instructions  text,
  target_industries   text[] not null default '{}',
  outreach_language   text not null default 'en',
  follow_up_days      int[] not null default '{3,7,21}',
  ai_model            text,
  is_default          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.projects enable row level security;
create index if not exists projects_owner_idx on public.projects(owner_id);

-- ── per-user provider secrets & settings ────────────────────────────────────
create table if not exists public.user_secrets (
  owner_id   uuid not null references auth.users(id) on delete cascade,
  provider   text not null,          -- openai | anthropic | google | openrouter | resend
  api_key    text,
  meta       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_id, provider)
);
alter table public.user_secrets enable row level security;

create table if not exists public.user_settings (
  owner_id        uuid primary key references auth.users(id) on delete cascade,
  default_provider text not null default 'openai',
  default_model    text not null default 'gpt-4o-mini',
  language         text not null default 'en',
  from_name        text,
  from_email       text,
  theme            text not null default 'light',
  data             jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);
alter table public.user_settings enable row level security;

-- ── knowledge base ──────────────────────────────────────────────────────────
create table if not exists public.knowledge_documents (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  kind       text not null default 'note',   -- pdf|doc|xlsx|ppt|website|script|note
  source_url text,
  content    text,
  tokens     int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.knowledge_documents enable row level security;
create index if not exists kb_project_idx on public.knowledge_documents(project_id);

-- ── leads ───────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  company_name      text not null,
  website           text,
  industry          text,
  location          text,
  contact_name      text,
  role              text,
  email             text,
  phone             text,
  linkedin_url      text,
  reason            text,
  fit_score         int not null default 0,
  opportunity_score int not null default 0,
  priority          lead_priority not null default 'C',
  stage             lead_stage not null default 'new',
  followup_step     int not null default 0,
  tags              text[] not null default '{}',
  notes             text,
  source            text not null default 'manual',
  last_contacted_at timestamptz,
  next_action_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.leads enable row level security;
create index if not exists leads_project_idx on public.leads(project_id);
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists leads_next_action_idx on public.leads(next_action_at);

-- ── messages (outbound + inbound) ───────────────────────────────────────────
create table if not exists public.messages (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid references public.leads(id) on delete cascade,
  project_id         uuid not null references public.projects(id) on delete cascade,
  owner_id           uuid not null references auth.users(id) on delete cascade,
  direction          msg_direction not null,
  subject            text,
  body               text,
  status             msg_status not null default 'draft',
  category           reply_category,
  ai_meta            jsonb not null default '{}'::jsonb,
  needs_human        boolean not null default false,
  handled            boolean not null default false,
  provider_message_id text,
  from_email         text,
  to_email           text,
  scheduled_at       timestamptz,
  sent_at            timestamptz,
  created_at         timestamptz not null default now()
);
alter table public.messages enable row level security;
create index if not exists messages_lead_idx on public.messages(lead_id);
create index if not exists messages_project_idx on public.messages(project_id);
create index if not exists messages_inbox_idx on public.messages(project_id, direction, handled);

-- ── tasks (sales-manager call list) ─────────────────────────────────────────
create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  owner_id            uuid not null references auth.users(id) on delete cascade,
  lead_id             uuid references public.leads(id) on delete cascade,
  type                text not null default 'call',   -- call|email|followup|review
  priority            lead_priority not null default 'B',
  title               text not null,
  reason              text,
  suggested_opening   text,
  suggested_next_step text,
  due_at              timestamptz,
  status              text not null default 'open',    -- open|done|snoozed
  created_at          timestamptz not null default now()
);
alter table public.tasks enable row level security;
create index if not exists tasks_project_idx on public.tasks(project_id);

-- ── daily reports ───────────────────────────────────────────────────────────
create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  report_date       date not null default (now() at time zone 'utc')::date,
  metrics           jsonb not null default '{}'::jsonb,
  summary           text,
  top_opportunities jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
alter table public.reports enable row level security;
create index if not exists reports_project_idx on public.reports(project_id);
create unique index if not exists reports_project_date_uidx on public.reports(project_id, report_date);

-- ── activity log ────────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind       text not null,
  message    text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.activity_log enable row level security;
create index if not exists activity_owner_idx on public.activity_log(owner_id, created_at desc);

-- is_admin() must exist before the policies below reference it.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================================
-- RLS — owner-scoped. Each policy: the row's owner_id must equal auth.uid().
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'projects','user_secrets','user_settings','knowledge_documents',
    'leads','messages','tasks','reports','activity_log'
  ] loop
    execute format('drop policy if exists own_all on public.%I;', t);
    execute format($f$
      create policy own_all on public.%I
        for all using (owner_id = auth.uid())
        with check (owner_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- profiles: a user reads/updates only their own row.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- Admin helpers
-- ============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Privilege-escalation guard: non-admins can't flip protected columns.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    new.is_admin      := old.is_admin;
    new.plan          := old.plan;
    new.blocked       := old.blocked;
    new.block_message := old.block_message;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_settings (owner_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin RPC: platform-wide stats (only callable by an admin).
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  select jsonb_build_object(
    'users',    (select count(*) from public.profiles),
    'projects', (select count(*) from public.projects),
    'leads',    (select count(*) from public.leads),
    'messages', (select count(*) from public.messages),
    'sent',     (select count(*) from public.messages where status = 'sent'),
    'positive', (select count(*) from public.leads where stage in ('positive','meeting','closed'))
  ) into result;
  return result;
end $$;

-- Admin RPC: list users with per-user rollups.
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, full_name text, is_admin boolean, plan text,
  blocked boolean, created_at timestamptz, projects bigint, leads bigint, sent bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  return query
    select p.id, p.email, p.full_name, p.is_admin, p.plan, p.blocked, p.created_at,
      (select count(*) from public.projects pr where pr.owner_id = p.id),
      (select count(*) from public.leads l where l.owner_id = p.id),
      (select count(*) from public.messages m where m.owner_id = p.id and m.status = 'sent')
    from public.profiles p
    order by p.created_at desc;
end $$;

-- Admin RPC: block / unblock / toggle admin / change plan.
create or replace function public.admin_set_user(
  target uuid, p_blocked boolean default null, p_block_message text default null,
  p_is_admin boolean default null, p_plan text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  update public.profiles set
    blocked       = coalesce(p_blocked, blocked),
    block_message = coalesce(p_block_message, block_message),
    is_admin      = coalesce(p_is_admin, is_admin),
    plan          = coalesce(p_plan, plan)
  where id = target;
end $$;

-- Admin RPC: list every project with owner + rollups.
create or replace function public.admin_list_projects()
returns table (
  id uuid, name text, owner_email text, leads bigint, sent bigint, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  return query
    select pr.id, pr.name, p.email,
      (select count(*) from public.leads l where l.project_id = pr.id),
      (select count(*) from public.messages m where m.project_id = pr.id and m.status = 'sent'),
      pr.created_at
    from public.projects pr
    join public.profiles p on p.id = pr.owner_id
    order by pr.created_at desc;
end $$;

-- ── seed your admin account (edit the email, then re-run this one line) ──────
-- update public.profiles set is_admin = true where lower(email) = 'you@example.com';

-- ============================================================================
-- UPGRADE 2026-07 — default admins, referrals, avatars, rich admin dashboard
-- Idempotent: safe to re-run the whole file.
-- ============================================================================

-- profiles: referral columns
alter table public.profiles add column if not exists ref_code text;
alter table public.profiles add column if not exists referred_by text;
create unique index if not exists profiles_ref_code_uidx on public.profiles(ref_code);

-- Backfill: anyone who signed up BEFORE the schema existed has no profile row.
-- Create profiles + settings for every existing auth user (idempotent).
insert into public.profiles (id, email, full_name, is_admin, ref_code)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       lower(u.email) in ('itsinjamul@gmail.com', 'gigwings@gmail.com'),
       upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
from auth.users u
on conflict (id) do nothing;
insert into public.user_settings (owner_id)
select id from auth.users on conflict do nothing;

-- default admins (edit this list to add/remove super admins)
update public.profiles set is_admin = true
  where lower(email) in ('itsinjamul@gmail.com', 'gigwings@gmail.com');

-- give existing rows a referral code if missing
update public.profiles
  set ref_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where ref_code is null;

-- New-user trigger: auto-admin the default emails, generate a ref code,
-- capture ?ref referrer from signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_admin boolean; v_ref text;
begin
  v_admin := lower(new.email) in ('itsinjamul@gmail.com', 'gigwings@gmail.com');
  v_ref := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.profiles (id, email, full_name, is_admin, ref_code, referred_by)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_admin, v_ref, nullif(new.raw_user_meta_data->>'ref', '')
  )
  on conflict (id) do nothing;
  insert into public.user_settings (owner_id) values (new.id) on conflict do nothing;
  return new;
end $$;

-- Rich admin dashboard: totals + lead mix + signup growth in one call.
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  select jsonb_build_object(
    'users',        (select count(*) from public.profiles),
    'active_users', (select count(distinct owner_id) from public.leads),
    'projects',     (select count(*) from public.projects),
    'leads',        (select count(*) from public.leads),
    'messages',     (select count(*) from public.messages),
    'sent',         (select count(*) from public.messages where status = 'sent'),
    'positive',     (select count(*) from public.leads where stage in ('positive','meeting','closed')),
    'by_priority',  (select coalesce(jsonb_object_agg(p, c), '{}'::jsonb)
                       from (select priority::text p, count(*) c from public.leads group by priority) x),
    'by_stage',     (select coalesce(jsonb_object_agg(s, c), '{}'::jsonb)
                       from (select stage::text s, count(*) c from public.leads group by stage) y),
    'signups',      (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'c', c) order by d), '[]'::jsonb)
                       from (select created_at::date d, count(*) c from public.profiles group by created_at::date) z)
  ) into result;
  return result;
end $$;

-- Referral count for a user (their own).
create or replace function public.my_referral_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles
   where referred_by = (select ref_code from public.profiles where id = auth.uid());
$$;

-- Avatars storage bucket (public read, owner-scoped writes by path).
-- The bucket insert always works; the policies are wrapped so a permission
-- quirk on storage.objects can never abort the rest of the schema.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
do $$
begin
  execute 'drop policy if exists avatars_read on storage.objects';
  execute 'create policy avatars_read on storage.objects for select using (bucket_id = ''avatars'')';
  execute 'drop policy if exists avatars_insert on storage.objects';
  execute 'create policy avatars_insert on storage.objects for insert to authenticated with check (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';
  execute 'drop policy if exists avatars_update on storage.objects';
  execute 'create policy avatars_update on storage.objects for update to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';
  execute 'drop policy if exists avatars_delete on storage.objects';
  execute 'create policy avatars_delete on storage.objects for delete to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';
exception when others then
  raise notice 'Avatar storage policies skipped (%). If avatar upload fails, add them under Storage → avatars → Policies.', sqlerrm;
end $$;
