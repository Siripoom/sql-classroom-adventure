-- Requires supabase/teacher-dashboard.sql, supabase/teacher-quizzes.sql and supabase/teacher-missions.sql first. Idempotent.
-- Students sign in with a class code (classroom_groups.join_code) plus any student code.
-- They never read tables: the only door is student_classroom(). It returns quiz scores and never quiz answers.
-- Missions come back grouped in topic order (the room shows one desk per topic), then in the order the teacher created them.
-- It does return each configured mission's exercise including answerSql, because the browser judges the query and builds the arrange step from it.
create or replace function public.new_join_code() returns text language plpgsql volatile set search_path = '' as $$
declare
 alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
 bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
 code text := '';
begin
 for i in 0..5 loop
  code := code || substr(alphabet, get_byte(bytes, i) % length(alphabet) + 1, 1);
 end loop;
 return code;
end $$;

alter table public.classroom_groups add column if not exists join_code text;
update public.classroom_groups set join_code = public.new_join_code() where join_code is null;
alter table public.classroom_groups alter column join_code set default public.new_join_code();
alter table public.classroom_groups alter column join_code set not null;
alter table public.classroom_groups drop constraint if exists classroom_groups_join_code_format;
alter table public.classroom_groups add constraint classroom_groups_join_code_format
 check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');
create unique index if not exists classroom_groups_join_code on public.classroom_groups(join_code);

-- name_confirmed is false only for a student created by sign-in, until the student types a name (student_set_name)
-- or the teacher renames them. Rows that already exist, and rows the teacher adds, are confirmed.
do $$ begin
 if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'classroom_students' and column_name = 'name_confirmed') then
  alter table public.classroom_students add column name_confirmed boolean not null default true;
  update public.classroom_students set name_confirmed = false where name = student_code;
 end if;
end $$;

create or replace function public.confirm_renamed_student() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.name is distinct from old.name then new.name_confirmed := true; end if;
 return new;
end $$;
drop trigger if exists classroom_students_confirm_rename on public.classroom_students;
create trigger classroom_students_confirm_rename before update of name on public.classroom_students
 for each row execute function public.confirm_renamed_student();

-- Any student code is accepted for a valid class code. A code seen before returns the same student;
-- a new code creates a student (name = the code) and returns it. Wrong class code, or an empty or
-- over-long student code, returns null. A class holds at most 300 students, so a leaked class code
-- cannot fill the table; known codes keep working when the class is full.
-- Not stable: it may insert, so it must stay volatile.
create or replace function public.student_classroom(p_class_code text, p_student_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 grp record;
 sid uuid;
 code text := trim(p_student_code);
begin
 if code is null or length(code) not between 1 and 40 then return null; end if;
 select g.id, g.teacher_id into grp from public.classroom_groups g where g.join_code = upper(trim(p_class_code));
 if not found then return null; end if;
 select s.id into sid from public.classroom_students s where s.class_id = grp.id and lower(s.student_code) = lower(code) limit 1;
 if sid is null then
  if (select count(*) from public.classroom_students s where s.class_id = grp.id) >= 300 then return null; end if;
  insert into public.classroom_students(teacher_id, class_id, student_code, name, name_confirmed)
  values (grp.teacher_id, grp.id, code, code, false) on conflict (class_id, student_code) do nothing;
  select s.id into sid from public.classroom_students s where s.class_id = grp.id and lower(s.student_code) = lower(code) limit 1;
  if sid is null then return null; end if;
 end if;
 return (
  with student as (select s.id, s.class_id, s.name, s.name_confirmed from public.classroom_students s where s.id = sid)
  select jsonb_build_object(
   'name', student.name,
   'needsName', not student.name_confirmed,
   'missions', coalesce((select jsonb_agg(jsonb_build_object('id', m.id::text, 'title', m.title, 'topic', m.topic, 'difficulty', m.difficulty,
     'description', m.description, 'due_date', m.due_date, 'exercise', m.exercise)
     order by array_position(array['SELECT','WHERE','ORDER BY','GROUP BY','JOIN'], m.topic), m.created_at, m.id)
     from public.classroom_missions m where m.class_id = student.class_id and m.exercise is not null), '[]'::jsonb),
   'unconfiguredMissionCount', (select count(*) from public.classroom_missions m where m.class_id = student.class_id and m.exercise is null),
   'questionCounts', jsonb_build_object(
    'pre', (select count(*) from public.classroom_quiz_questions q where q.class_id = student.class_id and q.kind = 'pre'),
    'post', (select count(*) from public.classroom_quiz_questions q where q.class_id = student.class_id and q.kind = 'post')),
   'attempted', jsonb_build_object(
    'pre', exists(select 1 from public.classroom_quiz_attempts a where a.student_id = student.id and a.kind = 'pre'),
    'post', exists(select 1 from public.classroom_quiz_attempts a where a.student_id = student.id and a.kind = 'post')),
   'scores', jsonb_build_object(
    'pre', (select jsonb_build_object('correct', x.correct, 'total', x.total, 'score', round(x.correct * 100.0 / x.total, 1))
     from (select count(*) filter (where a.answers ->> q.id::text = q.correct_option::text) as correct, count(*) as total
      from public.classroom_quiz_questions q
      join public.classroom_quiz_attempts a on a.student_id = student.id and a.kind = q.kind
      where q.class_id = student.class_id and q.kind = 'pre') x where x.total > 0),
    'post', (select jsonb_build_object('correct', x.correct, 'total', x.total, 'score', round(x.correct * 100.0 / x.total, 1))
     from (select count(*) filter (where a.answers ->> q.id::text = q.correct_option::text) as correct, count(*) as total
      from public.classroom_quiz_questions q
      join public.classroom_quiz_attempts a on a.student_id = student.id and a.kind = q.kind
      where q.class_id = student.class_id and q.kind = 'post') x where x.total > 0)))
  from student);
end $$;
revoke all on function public.student_classroom(text, text) from public;
grant execute on function public.student_classroom(text, text) to anon, authenticated;

-- A student names themselves once. After that only the teacher can rename, so a leaked student code cannot rewrite a name.
-- Replaying the call returns the stored name, so a lost response or a second tab converges.
create or replace function public.student_set_name(p_class_code text, p_student_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 resolved_class_id uuid;
 student_row record;
 clean text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
 select g.id into resolved_class_id from public.classroom_groups g where g.join_code = upper(trim(p_class_code));
 if resolved_class_id is null then return null; end if;
 select s.id, s.name, s.name_confirmed into student_row from public.classroom_students s
  where s.class_id = resolved_class_id and lower(s.student_code) = lower(trim(p_student_code)) limit 1 for update;
 if not found then return null; end if;
 if student_row.name_confirmed then return jsonb_build_object('status','confirmed','name',student_row.name); end if;
 if length(clean) not between 1 and 100 then return jsonb_build_object('status','invalid','name',student_row.name); end if;
 update public.classroom_students set name = clean, name_confirmed = true where id = student_row.id;
 return jsonb_build_object('status','confirmed','name',clean);
end $$;
revoke all on function public.student_set_name(text,text,text) from public;
grant execute on function public.student_set_name(text,text,text) to anon, authenticated;

-- Student quiz RPCs return answer-free questions and grade on the server.
create or replace function public.student_quiz(p_class_code text, p_student_code text, p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 resolved_class_id uuid;
 resolved_student_id uuid;
 attempt_row record;
 question_count integer;
 revision text;
 question_rows jsonb;
 correct_count integer;
 answered_count integer;
begin
 if p_kind not in ('pre','post') then return null; end if;
 select g.id into resolved_class_id from public.classroom_groups g where g.join_code = upper(trim(p_class_code));
 if resolved_class_id is null then return null; end if;
 select s.id into resolved_student_id from public.classroom_students s where s.class_id = resolved_class_id and lower(s.student_code) = lower(trim(p_student_code)) limit 1;
 if resolved_student_id is null then return null; end if;
 select count(*)::int,
  md5(coalesce(string_agg(q.id::text || ':' || q.prompt || ':' || array_to_string(q.options, '|'), '|' order by q.created_at, q.id), '')),
  coalesce(jsonb_agg(jsonb_build_object('id',q.id::text,'prompt',q.prompt,'options',to_jsonb(q.options)) order by q.created_at, q.id), '[]'::jsonb)
 into question_count,revision,question_rows
 from public.classroom_quiz_questions q where q.class_id = resolved_class_id and q.kind = p_kind;
 select a.created_at,a.answers into attempt_row from public.classroom_quiz_attempts a where a.student_id = resolved_student_id and a.kind = p_kind limit 1;
 if found then
  select count(*) filter (where attempt_row.answers ? q.id::text)::int,
   count(*) filter (where attempt_row.answers ->> q.id::text = q.correct_option::text)::int
  into answered_count,correct_count
  from public.classroom_quiz_questions q where q.class_id = resolved_class_id and q.kind = p_kind;
  return jsonb_build_object('kind',p_kind,'status','submitted','revision',case when question_count > 0 then revision else null end,'questions','[]'::jsonb,'result',jsonb_build_object('correct',coalesce(correct_count,0),'total',question_count,'score',case when question_count > 0 then round(correct_count * 100.0 / question_count,1) else null end,'answered',coalesce(answered_count,0),'unanswered',question_count-coalesce(answered_count,0),'submittedAt',attempt_row.created_at));
 end if;
 if question_count = 0 then return jsonb_build_object('kind',p_kind,'status','unavailable','revision',null,'questions','[]'::jsonb,'result',null); end if;
 return jsonb_build_object('kind',p_kind,'status','open','revision',revision,'questions',question_rows,'result',null);
end $$;

create or replace function public.student_submit_quiz(p_class_code text, p_student_code text, p_kind text, p_revision text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 resolved_class_id uuid;
 resolved_student_id uuid;
 attempt_row record;
 question_count integer;
 revision text;
 question_rows jsonb;
 correct_count integer;
 answered_count integer;
 inserted_id uuid;
begin
 if p_kind not in ('pre','post') then return null; end if;
 select g.id into resolved_class_id from public.classroom_groups g where g.join_code = upper(trim(p_class_code));
 if resolved_class_id is null then return null; end if;
 select s.id,s.class_id into resolved_student_id,resolved_class_id from public.classroom_students s where s.class_id = resolved_class_id and lower(s.student_code) = lower(trim(p_student_code)) limit 1 for update;
 if resolved_student_id is null then return null; end if;
 select a.created_at,a.answers into attempt_row from public.classroom_quiz_attempts a where a.student_id = resolved_student_id and a.kind = p_kind limit 1;
 select count(*)::int,
  md5(coalesce(string_agg(q.id::text || ':' || q.prompt || ':' || array_to_string(q.options, '|'), '|' order by q.created_at, q.id), '')),
  coalesce(jsonb_agg(jsonb_build_object('id',q.id::text,'prompt',q.prompt,'options',to_jsonb(q.options)) order by q.created_at, q.id), '[]'::jsonb)
 into question_count,revision,question_rows
 from public.classroom_quiz_questions q where q.class_id = resolved_class_id and q.kind = p_kind;
 if found and attempt_row.created_at is not null then
  select count(*) filter (where attempt_row.answers ? q.id::text)::int,
   count(*) filter (where attempt_row.answers ->> q.id::text = q.correct_option::text)::int
  into answered_count,correct_count
  from public.classroom_quiz_questions q where q.class_id = resolved_class_id and q.kind = p_kind;
  return jsonb_build_object('kind',p_kind,'status','submitted','revision',case when question_count > 0 then revision else null end,'questions','[]'::jsonb,'result',jsonb_build_object('correct',coalesce(correct_count,0),'total',question_count,'score',case when question_count > 0 then round(correct_count * 100.0 / question_count,1) else null end,'answered',coalesce(answered_count,0),'unanswered',question_count-coalesce(answered_count,0),'submittedAt',attempt_row.created_at));
 end if;
 if question_count = 0 then return jsonb_build_object('kind',p_kind,'status','unavailable','revision',null,'questions','[]'::jsonb,'result',null); end if;
 if p_revision is distinct from revision then return jsonb_build_object('kind',p_kind,'status','revision_changed','revision',revision,'questions',question_rows); end if;
 if p_answers is null or jsonb_typeof(p_answers) <> 'object' or exists (
  select 1 from jsonb_each(p_answers) answer
  where not exists (select 1 from public.classroom_quiz_questions q where q.class_id = resolved_class_id and q.kind = p_kind and q.id::text = answer.key)
   or jsonb_typeof(answer.value) <> 'number' or answer.value::text !~ '^[0-3]$'
 ) then return jsonb_build_object('kind',p_kind,'status','invalid_answers','message','คำตอบไม่ถูกต้อง'); end if;
 insert into public.classroom_quiz_attempts(teacher_id,class_id,student_id,kind,answers)
 select g.teacher_id,resolved_class_id,resolved_student_id,p_kind,p_answers from public.classroom_groups g where g.id = resolved_class_id
 on conflict (student_id,kind) do nothing returning id into inserted_id;
 select a.created_at,a.answers into attempt_row from public.classroom_quiz_attempts a where a.student_id = resolved_student_id and a.kind = p_kind limit 1;
 select count(*) filter (where attempt_row.answers ? q.id::text)::int,
  count(*) filter (where attempt_row.answers ->> q.id::text = q.correct_option::text)::int
 into answered_count,correct_count
 from public.classroom_quiz_questions q where q.class_id = resolved_class_id and q.kind = p_kind;
 return jsonb_build_object('kind',p_kind,'status','submitted','revision',revision,'questions','[]'::jsonb,'result',jsonb_build_object('correct',coalesce(correct_count,0),'total',question_count,'score',round(correct_count * 100.0 / question_count,1),'answered',coalesce(answered_count,0),'unanswered',question_count-coalesce(answered_count,0),'submittedAt',attempt_row.created_at));
end $$;
revoke all on function public.student_quiz(text,text,text) from public;
revoke all on function public.student_submit_quiz(text,text,text,text,jsonb) from public;
grant execute on function public.student_quiz(text,text,text) to anon, authenticated;
grant execute on function public.student_submit_quiz(text,text,text,text,jsonb) to anon, authenticated;
