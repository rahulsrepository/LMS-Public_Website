alter table public.profiles
  add column if not exists experience text not null default '',
  add column if not exists avatar_url text not null default '';

alter table public.job_openings
  add column if not exists industry text not null default 'IT';

create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_reads enable row level security;

drop policy if exists notification_reads_select_own on public.notification_reads;
create policy notification_reads_select_own on public.notification_reads
for select to authenticated using (user_id = auth.uid());

drop policy if exists notification_reads_insert_own on public.notification_reads;
create policy notification_reads_insert_own on public.notification_reads
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists notification_reads_update_own on public.notification_reads;
create policy notification_reads_update_own on public.notification_reads
for update to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('teaching', 'non-teaching')),
  attended_on date not null default current_date,
  status text not null check (status in ('present', 'absent')),
  marked_by uuid not null references public.profiles (id),
  unique (profile_id, category, attended_on)
);

alter table public.staff_attendance enable row level security;

drop policy if exists staff_attendance_read on public.staff_attendance;
create policy staff_attendance_read on public.staff_attendance
for select to authenticated
using (public.has_permission('attendance.faculty') or public.has_permission('faculty.manage'));

drop policy if exists staff_attendance_write on public.staff_attendance;
create policy staff_attendance_write on public.staff_attendance
for all to authenticated
using (public.has_permission('attendance.faculty') or public.has_permission('faculty.manage'))
with check (public.has_permission('attendance.faculty') or public.has_permission('faculty.manage'));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
for select to anon, authenticated using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_permission('staff.manage')
    or public.has_permission('faculty.manage')
  )
);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_permission('staff.manage')
    or public.has_permission('faculty.manage')
  )
)
with check (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_permission('staff.manage')
    or public.has_permission('faculty.manage')
  )
);

notify pgrst, 'reload schema';
