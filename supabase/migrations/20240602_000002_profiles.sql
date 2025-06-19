create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  phone text
);

alter table profiles enable row level security;

create policy "owner" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
