-- Wardrobe PWA — full database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ===== TABLES =====

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  category text not null,
  colour text not null,
  brand text,
  care_notes text,
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

-- ===== ROW LEVEL SECURITY =====

alter table items           enable row level security;
alter table outfits         enable row level security;
alter table outfit_logs     enable row level security;
alter table planned_outfits enable row level security;

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
