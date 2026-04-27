
create or replace function public.list_users_with_roles()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  roles public.app_role[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    return;
  end if;
  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    coalesce(array_agg(ur.role) filter (where ur.role is not null), '{}'::public.app_role[]) as roles
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  group by u.id, u.email, p.display_name, u.created_at
  order by u.created_at desc;
end;
$$;

revoke execute on function public.list_users_with_roles() from anon;
