create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  phone text,
  character_design text -- Add this line
);

alter table profiles enable row level security;

create policy "owner" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
