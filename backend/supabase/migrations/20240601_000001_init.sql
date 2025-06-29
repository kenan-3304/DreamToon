-- Renamed table from "dreams" to "comics" for clarity
create table comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  transcript text,
  panel_count smallint,
  storyboard jsonb,
  image_urls text[], -- Renamed from "panel_urls"
  cost_cents numeric(6,2)
  -- "composite_url" column removed
);

alter table comics enable row level security;

create policy "owner" on comics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);