create table dreams (

  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  transcript text,
  panel_count smallint,
  storyboard jsonb,
  panel_urls text[],
  composite_url text,
  cost_cents numeric(6,2)
);

alter table dreams enable row level security;

create policy "owner" on dreams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

