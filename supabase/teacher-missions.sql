-- Requires supabase/teacher-dashboard.sql first. Run before supabase/student-access.sql. Idempotent.
-- A mission carries the exercise the student plays: sample tables with rows, the answer SQL, a starter query, a hint and the row-order rule.
-- The shape is src/mission-contract.ts (MissionExercise). The teacher editor validates it by running the answer in SQLite;
-- this check only keeps a malformed or oversized document out of the table. null means the teacher has not set the exercise up yet.
-- coalesce(..., false) matters: a missing key makes a comparison null, and a CHECK accepts null.
alter table public.classroom_missions add column if not exists exercise jsonb;
alter table public.classroom_missions drop constraint if exists classroom_missions_exercise_shape;
alter table public.classroom_missions add constraint classroom_missions_exercise_shape check (
 exercise is null or coalesce((
  jsonb_typeof(exercise) = 'object'
  and exercise ->> 'version' = '1'
  and jsonb_typeof(exercise -> 'tables') = 'array' and jsonb_array_length(exercise -> 'tables') between 1 and 8
  and jsonb_typeof(exercise -> 'answerSql') = 'string' and length(btrim(exercise ->> 'answerSql')) > 0
  and jsonb_typeof(exercise -> 'starterSql') = 'string'
  and jsonb_typeof(exercise -> 'hint') = 'string'
  and exercise ->> 'rowOrder' in ('any', 'exact')
  and octet_length(exercise::text) <= 600000
 ), false)
);
