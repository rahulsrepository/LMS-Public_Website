-- C2C Academy LMS (Campus to Corporate)
-- Run this in the Supabase SQL editor.
-- Passwords stay in Supabase Auth. This script never stores them.
--
-- After it finishes:
-- 1. Create the first admin in Authentication → Users.
-- 2. Insert a matching profiles row (see the bottom of this file).
-- 3. Deploy supabase/functions/create-staff so receptionist/admin can open faculty logins.
-- 4. Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.jwt_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.has_permission(perm_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    join public.permissions perm on perm.id = rp.permission_id
    where p.id = auth.uid()
      and p.is_active
      and (perm.key = perm_key or perm.key = '*')
  );
$$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text default '',
  role text not null check (role in ('admin', 'receptionist', 'faculty', 'counsellor', 'accountant', 'student')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  key text primary key,
  label text not null
);

create table if not exists public.permissions (
  id bigint generated always as identity primary key,
  key text not null unique,
  description text not null
);

create table if not exists public.role_permissions (
  role text not null references public.roles (key) on delete cascade,
  permission_id bigint not null references public.permissions (id) on delete cascade,
  primary key (role, permission_id)
);

insert into public.roles (key, label) values
  ('admin', 'Admin'),
  ('receptionist', 'Receptionist'),
  ('faculty', 'Faculty'),
  ('counsellor', 'Counsellor'),
  ('accountant', 'Accountant'),
  ('student', 'Student')
on conflict (key) do nothing;

insert into public.permissions (key, description) values
  ('*', 'Full access'),
  ('faculty.manage', 'Create, edit, activate, deactivate and remove faculty'),
  ('staff.manage', 'Manage receptionist, counsellor and accountant accounts'),
  ('students.view', 'View student records'),
  ('students.write', 'Register and update permitted student details'),
  ('students.register', 'Register a student from counselling'),
  ('students.status', 'Activate or deactivate a student account'),
  ('students.delete', 'Delete a student record'),
  ('students.assigned', 'View assigned students'),
  ('students.fees', 'View fee-safe student details'),
  ('courses.manage', 'Manage courses'),
  ('courses.view', 'View courses'),
  ('subjects.manage', 'Manage subjects'),
  ('subjects.view', 'View subjects'),
  ('subjects.assigned', 'View assigned subjects'),
  ('batches.manage', 'Manage batches'),
  ('batches.view', 'View batches'),
  ('batches.assigned', 'View assigned batches'),
  ('attendance.view', 'View attendance'),
  ('attendance.mark', 'Mark attendance for assigned batches'),
  ('materials.manage', 'Manage study materials'),
  ('exams.manage', 'Create and publish examinations'),
  ('assignments.manage', 'Manage assignments'),
  ('results.manage', 'Evaluate and publish results'),
  ('enquiries.full', 'Full enquiry management'),
  ('enquiries.limited', 'Front-desk enquiry updates'),
  ('admissions.manage', 'Convert enquiries and confirm admissions'),
  ('admissions.assist', 'Assist with admissions'),
  ('admissions.view', 'View admissions'),
  ('fees.manage', 'Record and verify fees'),
  ('fees.view', 'View fee summaries'),
  ('reports.finance', 'Financial reports and exports'),
  ('reports.academic', 'Academic performance reports'),
  ('reports.enquiry', 'Enquiry reports'),
  ('reports.institute', 'Institute-wide reports'),
  ('notifications', 'Read notifications'),
  ('notifications.manage', 'Publish notifications'),
  ('logs', 'Read activity logs'),
  ('settings', 'Manage institute settings')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_id)
select 'admin', id from public.permissions where key = '*'
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'receptionist', id from public.permissions
where key in ('faculty.manage', 'students.view', 'students.write', 'courses.view', 'subjects.view', 'batches.view', 'attendance.view', 'enquiries.limited', 'admissions.assist', 'fees.view', 'notifications')
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'faculty', id from public.permissions
where key in ('students.assigned', 'subjects.assigned', 'batches.assigned', 'attendance.mark', 'materials.manage', 'exams.manage', 'assignments.manage', 'results.manage', 'reports.academic', 'notifications')
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'counsellor', id from public.permissions
where key in ('enquiries.full', 'admissions.manage', 'students.register', 'courses.view', 'batches.view', 'fees.view', 'reports.enquiry', 'notifications')
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'accountant', id from public.permissions
where key in ('students.fees', 'fees.manage', 'reports.finance', 'admissions.view', 'batches.view', 'courses.view', 'notifications')
on conflict do nothing;

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
for each row execute function public.protect_profile();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------------

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  duration text,
  fee numeric(12, 2) not null default 0,
  level text,
  mode text,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  code text not null
);

create table if not exists public.faculty (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  designation text default 'Trainer',
  qualification text default '',
  specialization text default '',
  status text not null default 'active' check (status in ('active', 'inactive', 'removed')),
  joined_on date default current_date
);

create table if not exists public.receptionists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  shift text default 'Morning',
  desk text default 'Front office'
);

create table if not exists public.counsellors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  focus text default 'Admissions'
);

create table if not exists public.accountants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  desk text default 'Accounts'
);

create table if not exists public.job_openings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  job_type text default 'Full-time',
  place text default 'Campus',
  blurb text default '',
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date text default '',
  mode text default 'Campus',
  seats integer not null default 20 check (seats > 0),
  blurb text default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  name text not null,
  schedule text default '',
  start_date date,
  end_date date,
  seats integer not null default 25 check (seats > 0),
  status text not null default 'running' check (status in ('running', 'waiting', 'closed'))
);

create table if not exists public.faculty_subjects (
  faculty_id uuid not null references public.faculty (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  primary key (faculty_id, subject_id)
);

create table if not exists public.faculty_batches (
  faculty_id uuid not null references public.faculty (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  primary key (faculty_id, batch_id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text default '',
  phone text default '',
  roll_no text not null unique,
  course_id uuid references public.courses (id) on delete set null,
  batch_id uuid references public.batches (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  admission_date date default current_date,
  guardian text default '',
  documents text[] default '{}',
  notes text default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists students_batch_idx on public.students (batch_id);
create index if not exists students_course_idx on public.students (course_id);
create index if not exists faculty_profile_idx on public.faculty (profile_id);

-- ---------------------------------------------------------------------------
-- Admissions
-- ---------------------------------------------------------------------------

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text default '',
  course_id uuid references public.courses (id) on delete set null,
  source text not null check (source in ('Website', 'Walk-in', 'Referral', 'Social Media', 'Workshop', 'Careers')),
  status text not null default 'new' check (status in ('new', 'contacted', 'interested', 'follow_up', 'converted', 'not_interested')),
  follow_up_date date,
  remarks text default '',
  counsellor_id uuid references public.profiles (id),
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists enquiries_status_idx on public.enquiries (status);
create index if not exists enquiries_follow_idx on public.enquiries (follow_up_date);

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.enquiries (id) on delete set null,
  student_id uuid references public.students (id) on delete cascade,
  course_id uuid references public.courses (id),
  batch_id uuid references public.batches (id),
  documents text[] default '{}',
  status text not null default 'processing' check (status in ('processing', 'enrolled')),
  counsellor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.counselling_sessions (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  session_date date not null,
  session_time text default '',
  mode text default 'Campus',
  notes text default '',
  counsellor_id uuid references public.profiles (id),
  status text not null default 'scheduled'
);

-- ---------------------------------------------------------------------------
-- Teaching
-- ---------------------------------------------------------------------------

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  marked_by uuid references public.profiles (id),
  unique (batch_id, student_id, attendance_date)
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects (id) on delete cascade,
  batch_id uuid references public.batches (id) on delete cascade,
  faculty_id uuid references public.faculty (id) on delete set null,
  title text not null,
  kind text not null,
  file_name text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.examinations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('mcq', 'coding')),
  batch_id uuid not null references public.batches (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  faculty_id uuid references public.faculty (id) on delete set null,
  duration_min integer not null default 30,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  examination_id uuid not null references public.examinations (id) on delete cascade,
  type text not null check (type in ('mcq', 'coding')),
  prompt text not null,
  options text[] default '{}',
  answer integer,
  language text,
  starter text,
  marks integer not null default 1
);

create table if not exists public.coding_testcases (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  input text not null,
  expected text not null,
  hidden boolean not null default false
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  examination_id uuid not null references public.examinations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  code jsonb not null default '{}'::jsonb,
  score numeric(8, 2) not null default 0,
  total numeric(8, 2) not null default 0,
  published boolean not null default false,
  status text not null default 'submitted',
  feedback text default '',
  submitted_at timestamptz not null default now(),
  unique (examination_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  batch_id uuid not null references public.batches (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  faculty_id uuid references public.faculty (id) on delete set null,
  deadline date not null,
  total_marks integer not null default 10,
  description text default ''
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  content text default '',
  file_name text default '',
  marks numeric(8, 2),
  feedback text default '',
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Fees
-- ---------------------------------------------------------------------------

create table if not exists public.fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  course_fee numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total_fee numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  pending_amount numeric(12, 2) not null default 0,
  due_date date
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null check (method in ('cash', 'upi', 'bank')),
  kind text not null default 'collection' check (kind in ('collection', 'refund', 'discount')),
  utr text default '',
  proof_name text default '',
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  paid_on date not null default current_date,
  receipt_no text not null unique,
  recorded_by uuid references public.profiles (id),
  note text default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_student_idx on public.payments (student_id);
create index if not exists payments_status_idx on public.payments (status);

create or replace function public.protect_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('refund', 'discount') and new.status = 'verified' and not public.has_permission('staff.manage') then
    raise exception 'Refunds and discounts need admin authorization';
  end if;
  if new.method in ('upi', 'bank') and new.kind = 'collection' and coalesce(new.utr, '') = '' then
    raise exception 'UTR / transaction ID is required';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_protect on public.payments;
create trigger payments_protect before insert or update on public.payments
for each row execute function public.protect_payment();

-- ---------------------------------------------------------------------------
-- System
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text default '',
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.institute_settings (
  id integer primary key default 1 check (id = 1),
  name text not null,
  phone text not null,
  email text not null,
  address text not null,
  hours text not null
);

insert into public.institute_settings (id, name, phone, email, address, hours)
values (1, 'C2C Academy', '+91 96864 88775', 'info@c2cacademy.in', 'C2C Academy Campus', 'Mon–Sat, 8:00 AM – 7:30 PM')
on conflict (id) do nothing;

create or replace function public.log_activity(action text, entity text default '', entity_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (actor_id, action, entity, entity_id)
  values (auth.uid(), action, entity, entity_id);
end;
$$;

-- Fee directory hides academic columns from the accounts desk.
create or replace view public.student_fee_directory
with (security_invoker = false) as
select
  s.id,
  s.full_name,
  s.roll_no,
  s.phone,
  s.course_id,
  s.batch_id,
  s.status,
  f.total_fee,
  f.paid_amount,
  f.pending_amount,
  f.due_date
from public.students s
left join public.fee_records f on f.student_id = s.id
where public.jwt_role() in ('admin', 'accountant', 'receptionist', 'counsellor');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.courses enable row level security;
alter table public.subjects enable row level security;
alter table public.faculty enable row level security;
alter table public.receptionists enable row level security;
alter table public.counsellors enable row level security;
alter table public.accountants enable row level security;
alter table public.batches enable row level security;
alter table public.faculty_subjects enable row level security;
alter table public.faculty_batches enable row level security;
alter table public.students enable row level security;
alter table public.enquiries enable row level security;
alter table public.admissions enable row level security;
alter table public.counselling_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.study_materials enable row level security;
alter table public.examinations enable row level security;
alter table public.questions enable row level security;
alter table public.coding_testcases enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.fee_records enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.institute_settings enable row level security;

create or replace function public.assigned_batch(batch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.faculty_batches fb
    join public.faculty f on f.id = fb.faculty_id
    where fb.batch_id = batch
      and f.profile_id = auth.uid()
      and f.status = 'active'
  );
$$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.has_permission('staff.manage')
  or public.has_permission('faculty.manage')
  or public.has_permission('students.view')
);
create policy profiles_update on public.profiles for update to authenticated
using (
  id = auth.uid()
  or public.has_permission('staff.manage')
  or (public.has_permission('faculty.manage') and role = 'faculty')
)
with check (
  id = auth.uid()
  or public.has_permission('staff.manage')
  or (public.has_permission('faculty.manage') and role = 'faculty')
);

-- catalogues
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (public.has_permission('staff.manage'));
create policy role_permissions_read on public.role_permissions for select to authenticated using (public.has_permission('staff.manage'));

create policy courses_read on public.courses for select to anon, authenticated using (true);
create policy courses_write on public.courses for all to authenticated
using (public.has_permission('courses.manage'))
with check (public.has_permission('courses.manage'));

create policy subjects_read on public.subjects for select to authenticated
using (
  public.has_permission('subjects.manage')
  or public.has_permission('subjects.view')
  or public.has_permission('subjects.assigned')
);
create policy subjects_write on public.subjects for all to authenticated
using (public.has_permission('subjects.manage'))
with check (public.has_permission('subjects.manage'));

create policy batches_read on public.batches for select to authenticated
using (
  public.has_permission('batches.manage')
  or public.has_permission('batches.view')
  or public.assigned_batch(id)
);
create policy batches_write on public.batches for all to authenticated
using (public.has_permission('batches.manage'))
with check (public.has_permission('batches.manage'));

create policy job_openings_read on public.job_openings for select to anon, authenticated using (true);
create policy job_openings_write on public.job_openings for all to authenticated
using (public.has_permission('careers.manage'))
with check (public.has_permission('careers.manage'));

create policy workshops_read on public.workshops for select to anon, authenticated using (true);
create policy workshops_write on public.workshops for all to authenticated
using (public.has_permission('workshops.manage'))
with check (public.has_permission('workshops.manage'));

-- Faculty account management is admin + receptionist only.
create policy faculty_read on public.faculty for select to authenticated
using (public.has_permission('faculty.manage') or profile_id = auth.uid());
create policy faculty_write on public.faculty for all to authenticated
using (public.has_permission('faculty.manage'))
with check (public.has_permission('faculty.manage'));

create policy faculty_subjects_read on public.faculty_subjects for select to authenticated
using (public.has_permission('faculty.manage') or public.has_permission('subjects.assigned'));
create policy faculty_subjects_write on public.faculty_subjects for all to authenticated
using (public.has_permission('faculty.manage'))
with check (public.has_permission('faculty.manage'));

create policy faculty_batches_read on public.faculty_batches for select to authenticated
using (public.has_permission('faculty.manage') or public.has_permission('batches.assigned'));
create policy faculty_batches_write on public.faculty_batches for all to authenticated
using (public.has_permission('faculty.manage'))
with check (public.has_permission('faculty.manage'));

create policy receptionists_admin on public.receptionists for all to authenticated
using (public.has_permission('staff.manage'))
with check (public.has_permission('staff.manage'));
create policy counsellors_admin on public.counsellors for all to authenticated
using (public.has_permission('staff.manage'))
with check (public.has_permission('staff.manage'));
create policy accountants_admin on public.accountants for all to authenticated
using (public.has_permission('staff.manage'))
with check (public.has_permission('staff.manage'));

-- students: accountant has no direct access; use student_fee_directory
create policy students_select on public.students for select to authenticated
using (
  public.has_permission('students.view')
  or public.has_permission('students.write')
  or (public.has_permission('students.register') and created_by = auth.uid())
  or public.assigned_batch(batch_id)
  or profile_id = auth.uid()
);
create policy students_insert on public.students for insert to authenticated
with check (public.has_permission('students.write') or public.has_permission('students.register') or public.has_permission('admissions.manage'));
create policy students_update on public.students for update to authenticated
using (public.has_permission('students.write') or (public.has_permission('students.register') and created_by = auth.uid()))
with check (public.has_permission('students.write') or (public.has_permission('students.register') and created_by = auth.uid()));
create policy students_delete on public.students for delete to authenticated
using (public.has_permission('students.delete'));

create policy enquiries_select on public.enquiries for select to authenticated
using (public.has_permission('enquiries.full') or public.has_permission('enquiries.limited'));
create policy enquiries_write on public.enquiries for insert to authenticated
with check (public.has_permission('enquiries.full') or public.has_permission('enquiries.limited'));
create policy enquiries_update on public.enquiries for update to authenticated
using (public.has_permission('enquiries.full') or public.has_permission('enquiries.limited'))
with check (public.has_permission('enquiries.full') or public.has_permission('enquiries.limited'));
create policy enquiries_delete on public.enquiries for delete to authenticated
using (public.has_permission('enquiries.full'));

create policy admissions_read on public.admissions for select to authenticated
using (public.has_permission('admissions.manage') or public.has_permission('admissions.assist') or public.has_permission('admissions.view'));
create policy admissions_write on public.admissions for all to authenticated
using (public.has_permission('admissions.manage') or public.has_permission('admissions.assist'))
with check (public.has_permission('admissions.manage') or public.has_permission('admissions.assist'));

create policy sessions_all on public.counselling_sessions for all to authenticated
using (public.has_permission('enquiries.full'))
with check (public.has_permission('enquiries.full'));

create policy attendance_select on public.attendance for select to authenticated
using (
  public.has_permission('attendance.view')
  or public.assigned_batch(batch_id)
  or student_id in (select id from public.students where profile_id = auth.uid())
);
create policy attendance_write on public.attendance for all to authenticated
using (public.has_permission('attendance.mark') and (public.has_permission('students.view') or public.assigned_batch(batch_id)))
with check (public.has_permission('attendance.mark') and (public.has_permission('students.view') or public.assigned_batch(batch_id)));

create policy materials_select on public.study_materials for select to authenticated
using (
  public.has_permission('materials.manage')
  or batch_id in (select batch_id from public.students where profile_id = auth.uid())
);
create policy materials_write on public.study_materials for all to authenticated
using (public.has_permission('materials.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id)))
with check (public.has_permission('materials.manage'));

create policy exams_select on public.examinations for select to authenticated
using (
  public.has_permission('exams.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id))
  or (status = 'published' and batch_id in (select batch_id from public.students where profile_id = auth.uid()))
);
create policy exams_write on public.examinations for all to authenticated
using (public.has_permission('exams.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id)))
with check (public.has_permission('exams.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id)));

create policy questions_select on public.questions for select to authenticated
using (
  exists (
    select 1 from public.examinations e
    where e.id = examination_id
      and (
        (public.has_permission('exams.manage') and (public.has_permission('courses.manage') or public.assigned_batch(e.batch_id)))
        or (e.status = 'published' and e.batch_id in (select batch_id from public.students where profile_id = auth.uid()))
      )
  )
);
create policy questions_write on public.questions for all to authenticated
using (
  public.has_permission('exams.manage') and exists (
    select 1 from public.examinations e
    where e.id = examination_id
      and (public.has_permission('courses.manage') or public.assigned_batch(e.batch_id))
  )
)
with check (public.has_permission('exams.manage'));

create policy testcases_staff on public.coding_testcases for all to authenticated
using (
  public.has_permission('exams.manage') and exists (
    select 1
    from public.questions q
    join public.examinations e on e.id = q.examination_id
    where q.id = question_id
      and (public.has_permission('courses.manage') or public.assigned_batch(e.batch_id))
  )
)
with check (public.has_permission('exams.manage'));

-- Students can read visible (non-hidden) cases for published exams only.
create policy testcases_student_visible on public.coding_testcases for select to authenticated
using (
  hidden = false and exists (
    select 1
    from public.questions q
    join public.examinations e on e.id = q.examination_id
    where q.id = question_id
      and e.status = 'published'
      and e.batch_id in (select batch_id from public.students where profile_id = auth.uid())
  )
);

create policy attempts_select on public.exam_attempts for select to authenticated
using (
  public.has_permission('results.manage')
  or student_id in (select id from public.students where profile_id = auth.uid())
);
create policy attempts_insert on public.exam_attempts for insert to authenticated
with check (student_id in (select id from public.students where profile_id = auth.uid()));
create policy attempts_grade on public.exam_attempts for update to authenticated
using (public.has_permission('results.manage'))
with check (public.has_permission('results.manage'));

create policy assignments_select on public.assignments for select to authenticated
using (
  (public.has_permission('assignments.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id)))
  or batch_id in (select batch_id from public.students where profile_id = auth.uid())
);
create policy assignments_write on public.assignments for all to authenticated
using (public.has_permission('assignments.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id)))
with check (public.has_permission('assignments.manage') and (public.has_permission('courses.manage') or public.assigned_batch(batch_id)));

create policy submissions_select on public.submissions for select to authenticated
using (
  public.has_permission('assignments.manage')
  or student_id in (select id from public.students where profile_id = auth.uid())
);
create policy submissions_student on public.submissions for insert to authenticated
with check (student_id in (select id from public.students where profile_id = auth.uid()));
create policy submissions_grade on public.submissions for update to authenticated
using (
  public.has_permission('assignments.manage')
  or student_id in (select id from public.students where profile_id = auth.uid())
)
with check (
  public.has_permission('assignments.manage')
  or student_id in (select id from public.students where profile_id = auth.uid())
);

create policy fees_select on public.fee_records for select to authenticated
using (
  public.has_permission('fees.manage')
  or public.has_permission('fees.view')
  or student_id in (select id from public.students where profile_id = auth.uid())
);
create policy fees_write on public.fee_records for all to authenticated
using (public.has_permission('fees.manage'))
with check (public.has_permission('fees.manage'));

create policy payments_select on public.payments for select to authenticated
using (
  public.has_permission('fees.manage')
  or public.has_permission('fees.view')
  or student_id in (select id from public.students where profile_id = auth.uid())
);
create policy payments_write on public.payments for insert to authenticated
with check (public.has_permission('fees.manage'));
create policy payments_update on public.payments for update to authenticated
using (public.has_permission('fees.manage'))
with check (public.has_permission('fees.manage'));

create policy notifications_read on public.notifications for select to authenticated
using (
  audience = 'all'
  or audience = public.jwt_role()
  or (audience = 'staff' and public.jwt_role() <> 'student')
  or (audience = 'students' and public.jwt_role() = 'student')
);
create policy notifications_write on public.notifications for all to authenticated
using (public.has_permission('notifications.manage'))
with check (public.has_permission('notifications.manage'));

create policy logs_read on public.activity_logs for select to authenticated
using (public.has_permission('logs'));
create policy logs_insert on public.activity_logs for insert to authenticated
with check (actor_id = auth.uid());

create policy settings_read on public.institute_settings for select to anon, authenticated using (true);
create policy settings_write on public.institute_settings for update to authenticated
using (public.has_permission('settings'))
with check (public.has_permission('settings'));

grant select on public.student_fee_directory to authenticated;
revoke all on public.student_fee_directory from anon;

-- Storage buckets for notes and payment proofs.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false), ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy materials_upload on storage.objects for insert to authenticated
with check (bucket_id = 'materials' and public.has_permission('materials.manage'));
create policy materials_read on storage.objects for select to authenticated
using (bucket_id = 'materials' and (public.has_permission('materials.manage') or public.jwt_role() = 'student'));
create policy proofs_upload on storage.objects for insert to authenticated
with check (bucket_id = 'payment-proofs' and public.has_permission('fees.manage'));
create policy proofs_read on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and (public.has_permission('fees.manage') or public.has_permission('fees.view')));

-- First admin, after you create the Auth user:
-- insert into public.profiles (id, full_name, email, phone, role, is_active)
-- values ('00000000-0000-0000-0000-000000000000', 'Kavita Sharma', 'admin@c2cacademy.in', '9686488775', 'admin', true);
