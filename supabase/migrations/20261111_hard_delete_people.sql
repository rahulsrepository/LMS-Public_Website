alter table public.staff_attendance
  alter column marked_by drop not null;

alter table public.staff_attendance
  drop constraint if exists staff_attendance_marked_by_fkey,
  add constraint staff_attendance_marked_by_fkey
    foreign key (marked_by) references public.profiles (id) on delete set null;

notify pgrst, 'reload schema';
