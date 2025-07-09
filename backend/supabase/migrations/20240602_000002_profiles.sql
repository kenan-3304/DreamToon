create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  phone text,
  character_design text, -- Add this line
  avatar_url text,
  original_photo_url text
);

alter table profiles enable row level security;

create policy "owner" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

