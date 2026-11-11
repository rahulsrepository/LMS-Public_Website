-- Apply this migration to existing Supabase projects to enable safe batch deletion
-- for admins, receptionists, and counsellors.

insert into public.permissions (key, description)
values ('batches.delete', 'Delete batches without students or active admissions')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_id)
select role, permissions.id
from (values ('receptionist'), ('counsellor')) as allowed_roles(role)
join public.permissions on permissions.key = 'batches.delete'
on conflict do nothing;

create or replace function public.prevent_batch_delete_with_students_or_admissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.students where batch_id = old.id) then
    raise exception 'Move or remove the students in this batch before deleting it.';
  end if;
  if exists (select 1 from public.admissions where batch_id = old.id) then
    raise exception 'Resolve the admissions linked to this batch before deleting it.';
  end if;
  return old;
end;
$$;

drop trigger if exists batches_delete_guard on public.batches;
create trigger batches_delete_guard before delete on public.batches
for each row execute function public.prevent_batch_delete_with_students_or_admissions();

drop policy if exists batches_delete on public.batches;
create policy batches_delete on public.batches for delete to authenticated
using (public.has_permission('batches.manage') or public.has_permission('batches.delete'));
