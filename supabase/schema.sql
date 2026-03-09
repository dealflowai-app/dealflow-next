-- ============================================================
-- Dealflow AI — Supabase Schema
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
-- Done. Copy this file and run it in:
-- Supabase Dashboard > SQL Editor > New Query > Paste > Run
-- ============================================================
