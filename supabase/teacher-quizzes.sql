-- Requires supabase/teacher-dashboard.sql first.
create table if not exists public.classroom_quiz_questions (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid(), class_id uuid not null,
 kind text not null check(kind in ('pre','post')), prompt text not null check(length(trim(prompt)) between 1 and 1000),
 options text[] not null check(cardinality(options)=4), correct_option smallint not null check(correct_option between 0 and 3),
 created_at timestamptz not null default now(), unique(id,class_id,teacher_id),
 foreign key(class_id,teacher_id) references public.classroom_groups(id,teacher_id) on delete cascade
);
create table if not exists public.classroom_quiz_attempts (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid(), class_id uuid not null, student_id uuid not null,
 kind text not null check(kind in ('pre','post')), answers jsonb not null default '{}'::jsonb check(jsonb_typeof(answers)='object'),
 created_at timestamptz not null default now(), unique(student_id,kind), unique(id,class_id,teacher_id),
 foreign key(student_id,class_id,teacher_id) references public.classroom_students(id,class_id,teacher_id) on delete cascade
);
create index if not exists classroom_quiz_questions_owner_class on public.classroom_quiz_questions(teacher_id,class_id);
create index if not exists classroom_quiz_attempts_owner_class on public.classroom_quiz_attempts(teacher_id,class_id);
create index if not exists classroom_quiz_attempts_student on public.classroom_quiz_attempts(student_id,class_id,teacher_id);
do $$ declare t text; begin
 foreach t in array array['classroom_quiz_questions','classroom_quiz_attempts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 execute format('drop policy if exists teacher_owns_rows on public.%I',t);
 execute format('create policy teacher_owns_rows on public.%I for all to authenticated using (teacher_id = (select auth.uid()) and (select auth.jwt())->''app_metadata''->>''role'' = ''teacher'') with check (teacher_id = (select auth.uid()) and (select auth.jwt())->''app_metadata''->>''role'' = ''teacher'')',t);
 end loop;
end $$;
