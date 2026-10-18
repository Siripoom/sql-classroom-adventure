-- Idempotent: safe to re-run in the Supabase SQL Editor (or apply as a migration).
-- Creates teacher-owned classroom tables protected by RLS (role + owner checks).
create table if not exists public.classroom_groups (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid() references auth.users(id),
 name text not null check (length(trim(name)) between 1 and 100), subject text not null default 'ฐานข้อมูลและ SQL',
 term text not null default '', created_at timestamptz not null default now(), unique(id, teacher_id)
);
create table if not exists public.classroom_students (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid(), class_id uuid not null,
 student_code text not null check(length(trim(student_code)) between 1 and 40), name text not null check(length(trim(name)) between 1 and 150),
 pre_test numeric check(pre_test between 0 and 100), post_test numeric check(post_test between 0 and 100),
 created_at timestamptz not null default now(), unique(class_id,student_code), unique(id,class_id,teacher_id),
 foreign key(class_id,teacher_id) references public.classroom_groups(id,teacher_id) on delete cascade
);
create table if not exists public.classroom_missions (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid(), class_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 150), topic text not null check(topic in ('SELECT','WHERE','ORDER BY','GROUP BY','JOIN')),
 difficulty text not null check(difficulty in ('easy','medium','hard')), description text not null default '', due_date date,
 created_at timestamptz not null default now(), unique(id,class_id,teacher_id),
 foreign key(class_id,teacher_id) references public.classroom_groups(id,teacher_id) on delete cascade
);
create table if not exists public.classroom_results (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid(), class_id uuid not null,
 student_id uuid not null, mission_id uuid not null, score numeric not null check(score between 0 and 100),
 completed boolean not null default false, minutes integer not null default 0 check(minutes between 0 and 60000),
 unique(student_id,mission_id),
 foreign key(student_id,class_id,teacher_id) references public.classroom_students(id,class_id,teacher_id) on delete cascade,
 foreign key(mission_id,class_id,teacher_id) references public.classroom_missions(id,class_id,teacher_id) on delete cascade
);
create index if not exists classroom_groups_owner on public.classroom_groups(teacher_id);
create index if not exists classroom_students_owner_class on public.classroom_students(teacher_id,class_id);
create index if not exists classroom_students_class_owner on public.classroom_students(class_id,teacher_id);
create index if not exists classroom_missions_owner_class on public.classroom_missions(teacher_id,class_id);
create index if not exists classroom_missions_class_owner on public.classroom_missions(class_id,teacher_id);
create index if not exists classroom_results_owner_class on public.classroom_results(teacher_id,class_id);
create index if not exists classroom_results_student on public.classroom_results(student_id,class_id,teacher_id);
create index if not exists classroom_results_mission on public.classroom_results(mission_id,class_id,teacher_id);
do $$ declare t text; begin
 foreach t in array array['classroom_groups','classroom_students','classroom_missions','classroom_results'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 execute format('drop policy if exists teacher_owns_rows on public.%I',t);
 execute format('create policy teacher_owns_rows on public.%I for all to authenticated using (teacher_id = (select auth.uid()) and (select auth.jwt())->''app_metadata''->>''role'' = ''teacher'') with check (teacher_id = (select auth.uid()) and (select auth.jwt())->''app_metadata''->>''role'' = ''teacher'')',t);
 end loop;
end $$;
