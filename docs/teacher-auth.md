# Teacher authentication

Project: https://okvrkiddjondmlzbepwo.supabase.co

The frontend uses Supabase Auth through the pinned @supabase/supabase-js SDK.
Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
Only public publishable/legacy anon keys belong in browser configuration.

## Account setup

1. In Supabase Authentication > Users, create the teacher email/password account.
   Set the password privately. Confirm the email through your normal verification
   process (or mark a verified account confirmed in the administrator dashboard).
2. Replace the email placeholder in supabase/grant-teacher.sql and run it in the
   project's SQL Editor as an administrator. This preserves other app metadata.
3. Sign in under ครูผู้สอน. An account without app_metadata.role = teacher is denied.

No public teacher registration or role-assignment endpoint is exposed.
The initial scope is teacher login and a teacher landing page, not class reports.
Student sign-in (class join code + student code) is separate and cannot open the teacher portal.

## Integration contract

- POST /auth/v1/token?grant_type=password: email/password authentication;
  uses the publishable key in apikey. Incorrect credentials show a generic error.
- GET /auth/v1/user: verify the current session with the server before rendering
  the teacher portal. Authorization uses administrator-controlled app_metadata,
  never user_metadata, the role selector, or the demo's localStorage values.
- SDK persists and refreshes the session. Initial load and auth changes revalidate
  the user. Verification failure does not render the teacher portal.
- SDK signOut(scope: local) ends the current session; errors remain visible.
- No application tables or learner records are exposed by this change. Before
  adding records, enforce role and ownership via RLS/server authorization too;
  hiding UI is not database authorization. JWT claims may lag administrative role
  changes until token refresh, so future sensitive operations need appropriate
  server-side verification.

## Checks

npm run build
npm test

Live checks performed: Auth settings reachable with the supplied publishable key,
email provider enabled. Successful teacher login requires a provisioned teacher
account and manual verification: correct password, refresh persistence, logout,
wrong password, and denial of an ordinary account.

## Teacher dashboard data (Supabase)

Run supabase/teacher-dashboard.sql once in the SQL Editor (it is safe to re-run).
It creates classroom_groups, classroom_students, classroom_missions and
classroom_results. Every table has RLS enabled; a row is visible and writable only
when teacher_id = auth.uid() and the JWT app_metadata.role is teacher. Composite
foreign keys (id, teacher_id) stop a teacher from linking rows to another
teacher's class. anon has no access.

The dashboard (src/teacher/Dashboard.tsx) covers: classes, students (with pre/post
test), missions, per-student results, overview charts, search/filter/sort and CSV
export (formula-injection safe). Student rows are a gradebook, not login accounts.

Verify after applying: an anon request to /rest/v1/classroom_groups returns 401;
a teacher session can create a class; a second teacher cannot see it.

## Dashboard pages and data loading

Pages: ภาพรวม (stats, topic chart, difficulty donut, top 6 students), ห้องเรียน, นักเรียน, ภารกิจ and รายงาน (pre/post-test, level distribution, follow-up list, least-completed missions). All numbers come from the four tables above.

PostgREST returns at most 1000 rows per request. The dashboard reads each table in 1000-row pages (fetchAllPages in src/teacher/model.ts) and fails the whole load if any page fails. A class of 43 students and 24 missions already has up to 1032 result rows.

## UI check without a teacher account

verify/ renders the dashboard against an in-memory Supabase fake (43 students, 24 missions). It is not part of the app build.

    npx vite --config verify/vite.config.ts
    node verify/shoot.mjs /tmp/shots 1586 992

The fake does not test RLS or login. Check those with a real teacher account: create a class, add a student, record a result, reload, then confirm a second teacher cannot see them.

## Pre/post quizzes (Supabase)

Run supabase/teacher-quizzes.sql once after teacher-dashboard.sql. It is safe to re-run. The two tables store quiz questions and student attempts, and the RLS rule allows only teacher-owned rows for authenticated users with the teacher role.

Each class has one quiz per kind, pre or post. The teacher records each student's chosen option because students have no login. The score is computed from the current questions, so editing or deleting a question recalculates existing results.

A quiz score replaces the manual Pre-test or Post-test number for that student in the dashboard and CSV. The dashboard loads quiz data separately, so a missing table only disables the quiz page.
Adding questions supports multiple drafts in one dialog. Each draft has four options
and its own correct answer. All drafts are validated before one array insert into
classroom_quiz_questions; a failed request keeps the form open for correction.
Editing an existing question still updates only that question.

## Mission exercises

Run supabase/teacher-missions.sql after teacher-dashboard.sql and before student-access.sql. It is safe to re-run. It adds `classroom_missions.exercise` (jsonb, null until the teacher sets it up) with a check on the document shape. The same teacher-owned RLS policy covers the column. Anonymous users still read nothing directly; `student_classroom` returns each configured mission with its exercise, including the answer SQL. See README, "Teacher missions".
