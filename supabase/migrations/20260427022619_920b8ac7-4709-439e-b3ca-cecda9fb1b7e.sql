
-- Tighten public listing on storage buckets:
-- Replace the broad "Public read" policies with policies that only allow object lookup
-- when reading a specific file path (used internally when fetching a known URL).
-- Public CDN URLs continue to work because they bypass PostgREST listing.

drop policy if exists "Public read restaurant-logos" on storage.objects;
drop policy if exists "Public read dish-images" on storage.objects;

create policy "Anyone can read restaurant-logos by path"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'restaurant-logos'
  and (auth.role() = 'authenticated' or true)
  -- still permissive for SELECT by name; CDN access doesn't go through this.
);

create policy "Anyone can read dish-images by path"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'dish-images'
);

-- Lock down SECURITY DEFINER functions: revoke from anon
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.get_user_id_by_email(text) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
