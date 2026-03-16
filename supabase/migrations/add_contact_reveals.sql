-- Contact reveal cache (skip trace results)
create table if not exists contact_reveals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  owner_name        text not null,
  property_address  text not null,
  city              text not null,
  state             text not null,
  phones            jsonb,          -- [{number, type, score}]
  emails            jsonb,          -- [{address, type, score}]
  mailing_address   jsonb,          -- {line1, city, state, zip} or null
  confidence        int,
  provider          text,
  cached_at         timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '30 days'),

  -- One reveal per owner per property address
  constraint uq_contact_reveal_owner_address unique (owner_name, property_address)
);

-- Indexes
create index idx_contact_reveals_user_id    on contact_reveals (user_id);
create index idx_contact_reveals_expires_at on contact_reveals (expires_at);
create index idx_contact_reveals_cached_at  on contact_reveals (cached_at);

-- Enable Row Level Security
alter table contact_reveals enable row level security;

-- Users can read their own reveals
create policy "Users can read their own reveals"
  on contact_reveals for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own reveals
create policy "Users can insert their own reveals"
  on contact_reveals for insert
  to authenticated
  with check (user_id = auth.uid());
