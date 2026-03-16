-- Discovery property cache (RentCast search results)
create table if not exists discovery_properties (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade,
  rentcast_id     text unique,
  address_line1   text not null,
  city            text not null,
  state           text not null,       -- 2-letter code
  zip_code        text,
  county          text,
  latitude        double precision,
  longitude       double precision,
  property_type   text,                -- Single Family, Multi Family, Condo, Townhouse, Land, Commercial
  bedrooms        int,
  bathrooms       double precision,
  sqft            int,
  lot_size        int,
  year_built      int,
  assessed_value  int,
  tax_amount      double precision,    -- annual taxes
  last_sale_date  date,
  last_sale_price int,
  owner_name      text,
  owner_occupied  boolean,
  features        jsonb,               -- raw features from RentCast
  raw_response    jsonb,               -- full RentCast response for future use
  search_city     text,                -- the city that was searched (cache lookup key)
  search_zip      text,                -- the zip that was searched (cache lookup key)
  cached_at       timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days')
);

-- Indexes for cache lookups
create index idx_discovery_search_city on discovery_properties (search_city);
create index idx_discovery_search_zip  on discovery_properties (search_zip);
create index idx_discovery_expires_at  on discovery_properties (expires_at);
create index idx_discovery_user_id     on discovery_properties (user_id);

-- Enable Row Level Security
alter table discovery_properties enable row level security;

-- Anyone authenticated can read cached properties
create policy "Users can read all cached properties"
  on discovery_properties for select
  to authenticated
  using (true);

-- Users can only insert rows tied to their own user_id
create policy "Users can insert their own cached properties"
  on discovery_properties for insert
  to authenticated
  with check (user_id = auth.uid());
