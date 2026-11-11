-- Repair existing projects where the earlier job-posting migration was already applied.
alter table public.job_openings
  add column if not exists company_name text not null default '',
  add column if not exists skills text not null default '',
  add column if not exists salary text not null default '',
  add column if not exists apply_url text not null default '';

insert into public.permissions (key, description)
values
  ('jobs.manage', 'Publish and manage job postings'),
  ('jobs.view', 'View job postings')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_id)
select 'faculty', id
from public.permissions
where key = 'jobs.view'
on conflict do nothing;

drop policy if exists job_openings_write on public.job_openings;
create policy job_openings_write on public.job_openings for all to authenticated
using (public.has_permission('jobs.manage'))
with check (public.has_permission('jobs.manage'));

drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications for all to authenticated
using (
  public.has_permission('notifications.manage')
  or public.has_permission('jobs.manage')
  or public.has_permission('workshops.manage')
)
with check (
  public.has_permission('notifications.manage')
  or public.has_permission('jobs.manage')
  or public.has_permission('workshops.manage')
);

notify pgrst, 'reload schema';
