create table if not exists public.classroom_attendance_records (
  id text primary key default ('attendance-' || gen_random_uuid()::text),
  class_id text not null references public.classrooms(id) on delete cascade,
  student_id text not null references public.users(uid) on delete cascade,
  attendance_date date not null,
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'excused')),
  marked_by text not null references public.users(uid) on delete restrict,
  marked_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_attendance_records_class_student_date_key unique (class_id, student_id, attendance_date)
);

create index if not exists classroom_attendance_records_class_date_idx
  on public.classroom_attendance_records (class_id, attendance_date);

create index if not exists classroom_attendance_records_student_date_idx
  on public.classroom_attendance_records (student_id, attendance_date desc);

alter table public.classroom_attendance_records enable row level security;

revoke all on public.classroom_attendance_records from anon;
revoke insert, update, delete on public.classroom_attendance_records from authenticated;
grant select on public.classroom_attendance_records to authenticated;

drop policy if exists classroom_attendance_records_read on public.classroom_attendance_records;
create policy classroom_attendance_records_read
on public.classroom_attendance_records
for select
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.classrooms classroom
    where classroom.id = classroom_attendance_records.class_id
      and (
        classroom.created_by = (select auth.uid())::text
        or exists (
          select 1
          from public.classroom_students membership
          where membership.class_id = classroom_attendance_records.class_id
            and membership.student_id = (select auth.uid())::text
        )
      )
  )
);

create or replace function public.mark_classroom_attendance(
  p_class_id text,
  p_student_id text,
  p_attendance_date date,
  p_status text,
  p_note text default null
)
returns table (
  id text,
  class_id text,
  student_id text,
  attendance_date date,
  status text,
  marked_by text,
  marked_at timestamptz,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor_id text := (select auth.uid())::text;
  v_normalized_status text := lower(trim(coalesce(p_status, '')));
  v_normalized_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_class_id is null or length(trim(p_class_id)) = 0
    or p_student_id is null or length(trim(p_student_id)) = 0
    or p_attendance_date is null then
    raise exception 'Classroom, student, and attendance date are required.' using errcode = '22023';
  end if;

  if v_normalized_status not in ('present', 'late', 'absent', 'excused') then
    raise exception 'Attendance status is invalid.' using errcode = '22023';
  end if;

  if v_normalized_note is not null and char_length(v_normalized_note) > 280 then
    raise exception 'Attendance note is too long.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.classrooms classroom
    where classroom.id = trim(p_class_id)
      and classroom.created_by = v_actor_id
  ) then
    raise exception 'Only the classroom owner can update attendance.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.classroom_students membership
    where membership.class_id = trim(p_class_id)
      and membership.student_id = trim(p_student_id)
  ) then
    raise exception 'The selected learner is not enrolled in this classroom.' using errcode = '22023';
  end if;

  return query
  insert into public.classroom_attendance_records (
    class_id,
    student_id,
    attendance_date,
    status,
    marked_by,
    marked_at,
    note,
    updated_at
  ) values (
    trim(p_class_id),
    trim(p_student_id),
    p_attendance_date,
    v_normalized_status,
    v_actor_id,
    now(),
    v_normalized_note,
    now()
  )
  on conflict (class_id, student_id, attendance_date)
  do update set
    status = excluded.status,
    marked_by = excluded.marked_by,
    marked_at = excluded.marked_at,
    note = excluded.note,
    updated_at = now()
  returning
    classroom_attendance_records.id,
    classroom_attendance_records.class_id,
    classroom_attendance_records.student_id,
    classroom_attendance_records.attendance_date,
    classroom_attendance_records.status,
    classroom_attendance_records.marked_by,
    classroom_attendance_records.marked_at,
    classroom_attendance_records.note,
    classroom_attendance_records.created_at,
    classroom_attendance_records.updated_at;
end;
$$;

revoke all on function public.mark_classroom_attendance(text, text, date, text, text) from public;
grant execute on function public.mark_classroom_attendance(text, text, date, text, text) to authenticated;
