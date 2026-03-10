-- ============================================================
-- DealFlow AI — Supabase Schema
-- Run this in your Supabase project: SQL Editor > New Query
-- ============================================================


-- ============================================================
-- 1. WAITLIST
-- Stores early access / waitlist signups from the landing page
-- ============================================================
create table if not exists waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  role        text check (role in ('wholesaler', 'buyer', 'agent', 'other')),
  source      text default 'hero',          -- which form they came from
  ip          text,                          -- optional, for dedup
  created_at  timestamptz default now()
);

-- Only allow inserts from the public anon key (no reads, no updates)
alter table waitlist enable row level security;

create policy "Anyone can join waitlist"
  on waitlist for insert
  with check (true);


-- ============================================================
-- 2. PROFILES
-- Extended user data linked to Supabase auth.users
-- Created automatically on signup via trigger below
-- ============================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  role          text check (role in ('wholesaler', 'buyer', 'agent', 'admin')),
  phone         text,
  company       text,
  markets       text[],                      -- e.g. ['Atlanta, GA', 'Tampa, FL']
  avatar_url    text,
  onboarded     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table profiles enable row level security;

-- Users can only read and update their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- 3. DEALS
-- Properties listed by wholesalers
-- ============================================================
create table if not exists deals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade,
  address         text not null,
  city            text not null,
  state           text not null,
  zip             text,
  ask_price       integer,                   -- in dollars
  arv             integer,
  assignment_fee  integer,
  beds            integer,
  baths           numeric(3,1),
  sqft            integer,
  deal_type       text check (deal_type in ('flip', 'hold', 'wholetail')),
  property_type   text check (property_type in ('sfr', 'multi', 'commercial', 'land')),
  status          text default 'active' check (status in ('active', 'under_contract', 'sold', 'expired')),
  photos          text[],
  description     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table deals enable row level security;

create policy "Owners can manage their deals"
  on deals for all
  using (auth.uid() = user_id);

create policy "Authenticated users can view active deals"
  on deals for select
  using (auth.role() = 'authenticated' and status = 'active');


-- ============================================================
-- 4. BUYER PROFILES
-- Buy box criteria for each buyer
-- ============================================================
create table if not exists buyer_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade,
  markets         text[],                    -- e.g. ['Atlanta, GA', 'Charlotte, NC']
  deal_types      text[],                    -- ['flip', 'hold']
  property_types  text[],                    -- ['sfr', 'multi']
  min_price       integer,
  max_price       integer,
  min_arv         integer,
  max_arv         integer,
  close_timeline  text,                      -- e.g. '10-14 days'
  notes           text,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table buyer_profiles enable row level security;

create policy "Buyers can manage their own buy box"
  on buyer_profiles for all
  using (auth.uid() = user_id);


-- ============================================================
-- 5. DEAL MATCHES
-- AI-generated matches between deals and buyers
-- ============================================================
create table if not exists deal_matches (
  id              uuid primary key default gen_random_uuid(),
  deal_id         uuid references deals(id) on delete cascade,
  buyer_id        uuid references profiles(id) on delete cascade,
  score           integer check (score between 0 and 100),
  status          text default 'pending' check (status in ('pending', 'contacted', 'interested', 'passed', 'closed')),
  ai_notes        text,
  created_at      timestamptz default now()
);

alter table deal_matches enable row level security;

create policy "Deal owners can view their matches"
  on deal_matches for select
  using (
    auth.uid() = (select user_id from deals where id = deal_id)
  );

create policy "Buyers can view their own matches"
  on deal_matches for select
  using (auth.uid() = buyer_id);


-- ============================================================
-- 6. SAVED MARKETS
-- Markets a wholesaler has searched / saved
-- ============================================================
create table if not exists saved_markets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  name         text not null,
  type         text check (type in ('city', 'county', 'zip')),
  state        text,
  buyer_count  integer default 0,
  last_synced  timestamptz,
  created_at   timestamptz default now()
);

alter table saved_markets enable row level security;
create policy "Users manage own markets"
  on saved_markets for all
  using (auth.uid() = user_id);


-- ============================================================
-- 7. CASH BUYERS
-- Buyers discovered from public records (ATTOM) per market
-- ============================================================
create table if not exists cash_buyers (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references profiles(id) on delete cascade,
  market_id             uuid references saved_markets(id) on delete set null,
  name                  text not null,
  entity_type           text check (entity_type in ('individual', 'llc', 'corporation', 'trust')),
  phone                 text,
  email                 text,
  mailing_address       text,
  cash_purchases_12mo   integer default 0,
  last_purchase_date    date,
  price_range_min       integer,
  price_range_max       integer,
  property_types        text[],
  contact_status        text default 'needs_enrichment'
                          check (contact_status in ('enriched', 'needs_enrichment', 'do_not_call', 'opted_out')),
  activity_score        integer check (activity_score between 0 and 100),
  in_crm                boolean default false,
  ai_preferences        jsonb,   -- structured data captured from call transcript
  attom_id              text,    -- ATTOM Data source ID for dedup
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table cash_buyers enable row level security;
create policy "Users manage own buyers"
  on cash_buyers for all
  using (auth.uid() = user_id);


-- ============================================================
-- 8. CAMPAIGNS
-- Outreach campaign configuration and stats
-- ============================================================
create table if not exists campaigns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles(id) on delete cascade,
  name                text not null,
  market_name         text,
  market_id           uuid references saved_markets(id) on delete set null,
  status              text default 'draft'
                        check (status in ('draft', 'running', 'paused', 'completed', 'cancelled')),
  mode                text check (mode in ('ai', 'manual')) default 'ai',
  buyer_source        text check (buyer_source in ('discovery', 'crm', 'both')) default 'discovery',
  buyer_count         integer default 0,
  script_template     text,
  script_custom       text,
  company_name        text,
  agent_name          text,
  tone                text check (tone in ('professional', 'conversational')) default 'professional',
  max_concurrent      integer default 5,
  call_hours_start    time default '09:00',
  call_hours_end      time default '19:00',
  voicemail_action    text check (voicemail_action in ('leave_message', 'hang_up')) default 'leave_message',
  retry_count         integer default 2,
  retry_hours         integer default 4,
  schedule_type       text check (schedule_type in ('now', 'later', 'recurring')) default 'now',
  scheduled_at        timestamptz,
  buyers_total        integer default 0,
  buyers_called       integer default 0,
  calls_qualified     integer default 0,
  calls_not_buying    integer default 0,
  calls_no_answer     integer default 0,
  total_talk_seconds  integer default 0,
  compliance_agreed   boolean default false,
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table campaigns enable row level security;
create policy "Users manage own campaigns"
  on campaigns for all
  using (auth.uid() = user_id);


-- ============================================================
-- 9. CAMPAIGN CALLS
-- Individual call records per campaign
-- ============================================================
create table if not exists campaign_calls (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid references campaigns(id) on delete cascade,
  buyer_id           uuid references cash_buyers(id) on delete cascade,
  bland_call_id      text,              -- Bland AI call ID for webhook correlation
  status             text check (status in ('queued', 'calling', 'in_progress', 'completed', 'failed', 'no_answer', 'voicemail')),
  outcome            text check (outcome in ('qualified', 'not_buying', 'no_answer', 'voicemail', 'callback', 'do_not_call')),
  duration_seconds   integer,
  transcript         text,
  ai_summary         text,
  ai_extracted       jsonb,             -- structured buyer preferences from transcript parsing
  compliance_check   jsonb,             -- DNC check result, time check, opt-out status at call time
  started_at         timestamptz,
  ended_at           timestamptz,
  created_at         timestamptz default now()
);

alter table campaign_calls enable row level security;
create policy "Users view own campaign calls"
  on campaign_calls for select
  using (
    auth.uid() = (select user_id from campaigns where id = campaign_id)
  );


-- ============================================================
-- 10. OPT OUTS / DO NOT CALL LIST
-- Permanent — never purge
-- ============================================================
create table if not exists opt_outs (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  email      text,
  name       text,
  reason     text,
  added_by   uuid references profiles(id),
  created_at timestamptz default now()
);

alter table opt_outs enable row level security;
create policy "Authenticated users can insert opt outs"
  on opt_outs for insert
  with check (auth.role() = 'authenticated');
create policy "Authenticated users view opt outs"
  on opt_outs for select
  using (auth.role() = 'authenticated');


-- ============================================================
-- Done. Copy this file and run it in:
-- Supabase Dashboard > SQL Editor > New Query > Paste > Run
-- ============================================================
