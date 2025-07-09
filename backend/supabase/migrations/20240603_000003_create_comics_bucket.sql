insert into storage.buckets (id, name, public)
values ('comics', 'comics', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
