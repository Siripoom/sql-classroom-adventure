# SQL Classroom Adventure

React + TypeScript + Vite + Three.js classroom game with real SQLite exercises in the browser. MongoDB is reserved for application data, not SQL execution.

## Run on macOS

Use Node.js 22.12+ or 24 LTS. Extract this folder inside `~/Developer`.

```bash
cd ~/Developer/sql-classroom-adventure
npm install
npm run dev
```

Open the localhost URL printed by Vite. `npm run build` validates TypeScript and builds production assets. `npm run preview` previews the production build.

## Included

- Student sign-in with class join code + student code, and a classroom scene with 8 desks (pre-test, 6 lessons, post-test). See "Student sign-in" below.
- Missions are written by the teacher: sample tables with rows, the answer SQL, a starter query, a hint and a row-order rule. See "Teacher missions" below.
- Actual SQLite execution via sql.js WebAssembly; each mission's database is rebuilt from the teacher's tables every time it opens.
- Exact result comparison, hints, tables, XP and three achievement badges.
- Progress is stored in this browser's localStorage, one entry per student (class code plus student code). It is lost if the browser data is cleared and is not a secure grade record.
- Teacher dashboard (Supabase login + RLS-protected classes, students, missions, results, CSV export). See docs/teacher-auth.md.
- Teacher quiz menu for pre-lesson and post-lesson quizzes per classroom.
- Responsive layout with cream, lavender, gold and mint colors.

## Optional MongoDB backend scaffold

```bash
cp .env.example .env
docker compose up -d
npm run server
```

GET http://localhost:3001/api/health reports database connectivity. The backend contains an Attempt schema. The frontend currently runs independently and does not send attempts to MongoDB. Before implementing record endpoints add verified authentication, role authorization, server-side grading, validation, rate limits and separate user data. Never trust client XP as an authoritative score. MongoDB is bound to localhost for development.

## Design system

Background #F8F7FC; cards #FFFFFF; primary #635BFF; lavender #EDE9FE; mint #A7E8D1; gold #FFC857; text #252442; editor #171D30. Font: Noto Sans Thai (Google Fonts, system sans-serif fallback). Spacing 8px grid; cards 20px radius; primary controls at least 44px high.

The classroom is procedural Three.js geometry, so no external 3D models are required. Prior mockup images were not available in this workspace and are not bundled. This starter provides implemented screens, not a production-ready LMS. Automatic collection of student attempts remains future work.

## Supabase teacher login

Teacher login now uses Supabase email/password authentication and an
administrator-assigned teacher role. Setup and API behavior are documented in
[docs/teacher-auth.md](docs/teacher-auth.md). MongoDB is optional and is not needed for teacher authentication.

## Student sign-in

Students sign in with a class join code (6 characters, shown on each class card and on the teacher's students page) and any student code they choose. The teacher gives out only the class code.

A student code the class has seen before opens the same account (matched without case, spaces trimmed). A new code creates a student whose name is the code, and right after sign-in a dialog asks for the student's real name (1 to 100 characters, spaces collapsed). The dialog cannot be dismissed. The name is stored once through `student_set_name`; after that only the teacher can change it, on the students page, where students who have not yet given a name carry a "รอนักเรียนระบุชื่อ" badge. A teacher rename also clears the pending state. Students that existed before this change keep their names, except those whose name still equals their code, which are asked once. A wrong class code, a blank or over-40-character student code, or a class that already has 300 students (new codes only) is refused.

Setup order in the Supabase SQL editor: `supabase/teacher-dashboard.sql`, `supabase/teacher-quizzes.sql`, `supabase/teacher-missions.sql`, then `supabase/student-access.sql`. The last two are idempotent. `student-access.sql` adds `classroom_groups.join_code` and the `student_classroom` function, which is the only thing anonymous users can call. It returns the class name, the class's playable missions, the count of missions the teacher has not set up, question counts and the student's own scores. Quiz question text and quiz answers are never returned, and anonymous users cannot read or write any table directly. Mission answers are returned, see "Teacher missions".

## Teacher missions

In the teacher dashboard, a mission has a title, the task text students read, a topic and level, an optional due date, and an exercise:

- 1 to 8 tables, each with 1 to 20 typed columns (INTEGER, REAL, TEXT), up to 200 rows, and NULL cells.
- The answer SQL, one plain SELECT. The editor runs it on the tables and shows the expected rows before saving. `WITH` and writes are refused.
- A starter query, a hint, and whether row order is checked (for ORDER BY tasks).

Students get a database built from exactly those tables. A query passes when its column names and values match the answer's, in order only if the teacher asked for that. Phase 1 below is built from the answer's words. `supabase/teacher-missions.sql` adds `classroom_missions.exercise` with a shape check. Missions created before it have no exercise, stay hidden from students, and the classroom tells students how many are being prepared until the teacher opens each one, adds tables and an answer, and saves.

Missions appear to students in the order the teacher created them, between the pre-test and the post-test. Each desk opens when every earlier desk is finished. A student's pass is stored against a fingerprint of the title, task text and exercise, so editing any of those asks the student to pass the mission again. Level and due date do not.

Limit: the answer SQL is part of what the browser receives, because the browser checks the query and builds phase 1. A student who reads the network response can see it. Passing and XP stay in the browser. Treat both as practice, not as a grade. Server-side grading would be the next step if that matters.

Each mission in the SQL lab has two phases. Phase 1 (เรียงคำสั่ง): tap the words of the answer into order. Phase 2 (เขียนคำสั่ง): write the query in the editor; XP is awarded here. 

Desk state comes from the database: a quiz desk exists when the class has questions for it and shows the score once the student has an attempt; a mission desk exists for each mission the teacher has set up. Desks unlock in order, one at a time: pre-test (if the class has one), the missions, post-test (if the class has one). A desk opens only when every earlier desk is finished. A new student therefore starts with the pre-test, or the first mission if there is none. That rule runs in the browser, because mission completion is stored in the browser; it is a study order, not a security check. Mission completion and XP are stored in the browser. The room picture has 8 painted desks: the post-test always takes the podium and the pre-test and missions fill the desks before it. A class with more than 6 missions plus a pre-test lists the extra missions under "ภารกิจเพิ่มเติม" in the profile card.

Limits: there is no PIN, so anyone who knows the class code and a student's code can open that student's account, and anyone with the class code can add students up to the cap. There is no rate limiting. Add a PIN or a rate limit before using this with real grades. The quiz desks do not open a quiz page yet.

Checks: `node verify/student-access-check.mjs` runs the SQL on in-memory Postgres (install steps are at the top of the script). It also runs the returned exercises through the real student parser and sql.js. `node verify/mission-flow.mjs` drives the whole path in a browser: the teacher editor, the real SQL, then the student lab (it needs `npx vite --config verify/vite.config.ts` running and the same PGlite install). `node verify/login-size.mjs` compares the student and teacher login cards.
