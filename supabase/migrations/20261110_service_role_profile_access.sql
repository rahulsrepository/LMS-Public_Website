-- Service-role Edge Functions must be able to update access flags on profiles.
-- RLS is bypassed for service_role, but the profiles_protect trigger also needs
-- an explicit bypass for trusted server-side account management.
create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not public.has_permission('staff.manage') then
      raise exception 'Only an admin can change a role';
    end if;
    if new.is_active is distinct from old.is_active then
      if public.has_permission('staff.manage') then
        null;
      elsif public.has_permission('faculty.manage') and old.role = 'faculty' then
        null;
      else
        raise exception 'You cannot change this account status';
      end if;
    end if;
    if old.role = 'faculty' and not public.has_permission('faculty.manage') and not public.has_permission('staff.manage') and auth.uid() is distinct from old.id then
      raise exception 'Faculty records are managed by admin and receptionist';
    end if;
  end if;
  return new;
end;
$$;
