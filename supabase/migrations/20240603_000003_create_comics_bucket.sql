insert into storage.buckets (id, name, public)
values ('comics', 'comics', false)
on conflict (id) do nothing;
