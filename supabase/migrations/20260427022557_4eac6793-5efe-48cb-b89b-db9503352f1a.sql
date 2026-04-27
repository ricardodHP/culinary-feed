
-- Create public buckets
insert into storage.buckets (id, name, public)
values ('restaurant-logos', 'restaurant-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

-- Public read for both buckets
create policy "Public read restaurant-logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'restaurant-logos');

create policy "Public read dish-images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'dish-images');

-- Helper expectation: files stored under "<restaurant_id>/..."
-- Owner or admin can write to restaurant-logos
create policy "Owner or admin write restaurant-logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'restaurant-logos'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid()
    )
  )
);

create policy "Owner or admin update restaurant-logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'restaurant-logos'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid()
    )
  )
);

create policy "Owner or admin delete restaurant-logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'restaurant-logos'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid()
    )
  )
);

-- Same for dish-images
create policy "Owner or admin write dish-images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dish-images'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid()
    )
  )
);

create policy "Owner or admin update dish-images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'dish-images'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid()
    )
  )
);

create policy "Owner or admin delete dish-images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'dish-images'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid()
    )
  )
);

-- Helper RPC so admins can resolve a user's email into a UUID when assigning owners.
-- Returns null when not found or when caller is not admin.
create or replace function public.get_user_id_by_email(_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    return null;
  end if;
  select id into found_id from auth.users where email = lower(_email) limit 1;
  return found_id;
end;
$$;
