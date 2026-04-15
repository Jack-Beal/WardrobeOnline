-- Wardrobe PWA — full database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ===== TABLES =====

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  category text not null,
  colour text not null,
  season text not null,
  brand text,
  care_notes text,
  image_url text,
  laundry_status text default 'clean',
  wear_count integer default 0,
  last_worn date,
  created_at timestamptz default now()
);

create table outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  item_ids uuid[] not null,
  ai_rating numeric,
  ai_feedback text,
  created_at timestamptz default now()
);

create table outfit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  outfit_id uuid references outfits,
  item_ids uuid[],
  worn_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

create table planned_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  outfit_id uuid references outfits,
  item_ids uuid[],
  planned_date date not null,
  created_at timestamptz default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

create table trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips on delete cascade,
  day_date date not null,
  outfit_id uuid references outfits,
  item_ids uuid[]
);

-- ===== ROW LEVEL SECURITY =====

alter table items          enable row level security;
alter table outfits        enable row level security;
alter table outfit_logs    enable row level security;
alter table planned_outfits enable row level security;
alter table trips          enable row level security;
alter table trip_days      enable row level security;

-- Items policies
create policy "Users manage own items"
  on items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Outfits policies
create policy "Users manage own outfits"
  on outfits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Outfit logs policies
create policy "Users manage own outfit_logs"
  on outfit_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Planned outfits policies
create policy "Users manage own planned_outfits"
  on planned_outfits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trips policies
create policy "Users manage own trips"
  on trips for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trip days: access via parent trip ownership
create policy "Users manage own trip_days"
  on trip_days for all
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
    )
  );

-- ===== STORAGE =====
-- In Supabase Dashboard → Storage → New bucket:
--   Name: wardrobe-images
--   Public: true (enable public read access)
--
-- Then add storage policy for authenticated uploads:
-- Dashboard → Storage → wardrobe-images → Policies → New policy:
--   Allowed operation: INSERT, UPDATE, DELETE
--   Policy: (auth.uid() = owner) — or use the template "Allow authenticated uploads"
