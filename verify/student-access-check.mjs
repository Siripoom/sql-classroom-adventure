// Usage: node verify/student-access-check.mjs
// Proves supabase/teacher-missions.sql and supabase/student-access.sql on an in-memory Postgres (PGlite) with a stubbed Supabase auth schema.
// Needs: mkdir /tmp/pgtest && cd /tmp/pgtest && npm init -y && npm i @electric-sql/pglite@0.2.17
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import initSqlJs from 'sql.js';
import {parseStudentClassroom} from '../src/student/student-access.ts';
import {validateMissionExercise} from '../src/mission-sql.ts';

const require=createRequire('/tmp/pgtest/');
const {PGlite}=require('@electric-sql/pglite');
const sql=name=>readFileSync(new URL(`../supabase/${name}`,import.meta.url),'utf8');

const db=new PGlite();
await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
 grant usage on schema public, auth to anon, authenticated;
 insert into auth.users values ('00000000-0000-0000-0000-00000000000a');
`);
await db.exec(sql('teacher-dashboard.sql'));
await db.exec(sql('teacher-quizzes.sql'));
// a class that exists before the join_code migration
await db.exec(`insert into public.classroom_groups(id,teacher_id,name) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','เก่า');
 insert into public.classroom_missions(id,teacher_id,class_id,title,topic,difficulty) values ('cccccccc-0000-0000-0000-000000000009','00000000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','ภารกิจเก่า','SELECT','easy');
 alter table public.classroom_groups drop constraint if exists classroom_groups_join_code_format;`);
await db.exec(sql('teacher-missions.sql'));
await db.exec(sql('teacher-missions.sql')); // idempotent
await db.exec(sql('student-access.sql'));
await db.exec(sql('student-access.sql')); // idempotent

const A='00000000-0000-0000-0000-00000000000a';
const M1='cccccccc-0000-0000-0000-000000000001',M2='cccccccc-0000-0000-0000-000000000002',M3='cccccccc-0000-0000-0000-000000000003';
const exercise=(table,answerSql,rowOrder='any')=>({version:1,tables:[{name:table,columns:[{name:'id',type:'INTEGER'},{name:'name',type:'TEXT'},{name:'price',type:'REAL'}],rows:[[1,'สมุด',25],[2,'ปากกา',10],[3,'ถุง',null]]}],answerSql,starterSql:'SELECT ',hint:'ใช้ WHERE',rowOrder});
const EX1=exercise('products','SELECT name FROM products WHERE price >= 25'),EX3=exercise('items','SELECT id FROM items ORDER BY id DESC','exact');
await db.exec(`
 insert into public.classroom_groups(id,teacher_id,name) values ('22222222-2222-2222-2222-222222222222','${A}','ใหม่');
 insert into public.classroom_students(id,teacher_id,class_id,student_code,name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','${A}','22222222-2222-2222-2222-222222222222','66001','มะลิ'),
  ('aaaaaaaa-0000-0000-0000-000000000002','${A}','22222222-2222-2222-2222-222222222222','66002','ภูมิ'),
  ('aaaaaaaa-0000-0000-0000-000000000003','${A}','11111111-1111-1111-1111-111111111111','66001','นักเรียนห้องเก่า');
 insert into public.classroom_missions(id,teacher_id,class_id,title,topic,difficulty,exercise,created_at) values
  ('${M1}','${A}','22222222-2222-2222-2222-222222222222','m1','SELECT','easy','${JSON.stringify(EX1)}','2026-01-01'),
  ('${M2}','${A}','22222222-2222-2222-2222-222222222222','m2','SELECT','easy',null,'2026-01-02'),
  ('${M3}','${A}','22222222-2222-2222-2222-222222222222','m3','WHERE','hard','${JSON.stringify(EX3)}','2026-01-03');
 insert into public.classroom_quiz_questions(id,teacher_id,class_id,kind,prompt,options,correct_option) values
  ('bbbbbbbb-0000-0000-0000-000000000001','${A}','22222222-2222-2222-2222-222222222222','pre','q1','{a,b,c,d}',2),
  ('bbbbbbbb-0000-0000-0000-000000000002','${A}','22222222-2222-2222-2222-222222222222','pre','q2','{a,b,c,d}',0),
  ('bbbbbbbb-0000-0000-0000-000000000003','${A}','22222222-2222-2222-2222-222222222222','pre','q3','{a,b,c,d}',1);
 insert into public.classroom_quiz_attempts(teacher_id,class_id,student_id,kind,answers) values
  ('${A}','22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000001','pre',
   '{"bbbbbbbb-0000-0000-0000-000000000001":2,"bbbbbbbb-0000-0000-0000-000000000002":3,"bbbbbbbb-0000-0000-0000-000000000003":1}');
`);
const codes=Object.fromEntries((await db.query('select name,join_code from public.classroom_groups')).rows.map(r=>[r.name,r.join_code]));
const check=(label,ok)=>{assert.ok(ok,label);console.log('ok  '+label)};

check('every class got a 6 char join code',Object.values(codes).every(c=>/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(c)));
check('codes are unique',new Set(Object.values(codes)).size===2);

await db.exec('set role anon');
const call=async(c,s)=>(await db.query('select public.student_classroom($1,$2) as r',[c,s])).rows[0].r;

const mali=await call(codes['ใหม่'],'66001');
const playable=(id,title,topic,difficulty,ex)=>({id,title,topic,difficulty,description:'',due_date:null,exercise:ex});
assert.deepEqual(mali,{name:'มะลิ',needsName:false,missions:[playable(M1,'m1','SELECT','easy',EX1),playable(M3,'m3','WHERE','hard',EX3)],unconfiguredMissionCount:1,questionCounts:{pre:3,post:0},attempted:{pre:true,post:false},scores:{pre:{correct:2,total:3,score:66.7},post:null}});
check('right codes return name, configured missions in creation order, the unconfigured count, quiz counts and the graded score',true);
const room=parseStudentClassroom(mali);
check('the real student parser accepts the SQL reply',room.snapshot.missions.map(m=>m.id).join()===[M1,M3].join()&&room.snapshot.unconfiguredMissionCount===1);
const SQL=await initSqlJs();
const expected=room.snapshot.missions.map(m=>validateMissionExercise(SQL,m.exercise));
check('the real SQLite engine runs each returned answer on its own sample data',JSON.stringify(expected)===JSON.stringify([[{columns:['name'],values:[['สมุด']]}],[{columns:['id'],values:[[3],[2],[1]]}]]));
const legacy=await call(codes['เก่า'],'66001');
check('a mission written before the exercise column is skipped and counted, not sent half-built',legacy.missions.length===0&&legacy.unconfiguredMissionCount===1);
check('lowercase class code with spaces still works',JSON.stringify(await call(` ${codes['ใหม่'].toLowerCase()} `,' 66001 '))===JSON.stringify(mali));
const phum=await call(codes['ใหม่'],'66002');
check('student without attempt has no score',phum.name==='ภูมิ'&&phum.scores.pre===null&&phum.questionCounts.pre===3);
check('same student code in another class resolves inside that class only',(await call(codes['เก่า'],'66001')).name==='นักเรียนห้องเก่า'&&(await call(codes['เก่า'],'66001')).scores.pre===null);
const count=async cls=>Number((await db.query('select count(*) n from public.classroom_students where class_id=$1',[cls])).rows[0].n);
const quizCall=async(kind,student,revision,answers)=>{const query='select public.student_submit_quiz($1,$2,$3,$4,$5::jsonb) as r';return (await db.query(query,[codes['ใหม่'],student,kind,revision,JSON.stringify(answers)])).rows[0].r};
const openQuiz=(await db.query('select public.student_quiz($1,$2,$3) as r',[codes['ใหม่'],'66002','pre'])).rows[0].r;
check('student quiz returns answer-free questions',openQuiz.status==='open'&&openQuiz.questions.length===3&&!JSON.stringify(openQuiz).includes('correct_option'));
const firstSubmission=await quizCall('pre','66002',openQuiz.revision,{[openQuiz.questions[0].id]:2});
check('student quiz grades on the server',firstSubmission.status==='submitted'&&firstSubmission.result.correct===1&&firstSubmission.result.total===3&&firstSubmission.result.answered===1);
const replay=await quizCall('pre','66002',openQuiz.revision,{[openQuiz.questions[0].id]:0,[openQuiz.questions[1].id]:0,[openQuiz.questions[2].id]:1});
check('repeating a student quiz returns the original result',JSON.stringify(replay)===JSON.stringify(firstSubmission));
const afterQuiz=await call(codes['ใหม่'],'66002');
check('classroom marks a submitted zero or partial result as attempted',afterQuiz.attempted.pre===true&&afterQuiz.scores.pre.score===33.3);
const NEW='22222222-2222-2222-2222-222222222222';
await db.exec('reset role');const before=await count(NEW);await db.exec('set role anon');
const fresh=await call(codes['ใหม่'],'99999');
check('unknown student code in a valid class creates a student named by the code',fresh.name==='99999'&&fresh.scores.pre===null&&fresh.scores.post===null&&fresh.questionCounts.pre===3);
const again=await call(codes['ใหม่'],' 99999 ');
await db.exec('reset role');
check('same code again reuses the account (one new row, same id)',await count(NEW)===before+1&&JSON.stringify(again)===JSON.stringify(fresh)&&(await db.query("select count(*) n from public.classroom_students where student_code='99999'")).rows[0].n==1);
await db.exec('set role anon');
const setName=async(student,name,classCode=codes['ใหม่'])=>(await db.query('select public.student_set_name($1,$2,$3) as r',[classCode,student,name])).rows[0].r;
check('a new student starts with needsName and a teacher-added student does not',fresh.needsName===true&&phum.needsName===false);
check('a blank or over-long name is refused and nothing changes',(await setName('99999','   ')).status==='invalid'&&(await setName('99999','ก'.repeat(101))).status==='invalid'&&(await call(codes['ใหม่'],'99999')).needsName===true);
check('wrong class code or unknown student returns null',(await setName('99999','x','ZZZZZZ'))===null&&(await setName('nobody','x'))===null);
const named=await setName(' 99999 ','  สมชาย    ใจดี  ');
check('a student names themselves once, spaces collapsed',named.status==='confirmed'&&named.name==='สมชาย ใจดี');
const afterName=await call(codes['ใหม่'],'99999');
check('classroom returns the new name and no longer asks',afterName.name==='สมชาย ใจดี'&&afterName.needsName===false);
check('naming again keeps the first name',(await setName('99999','คนอื่น')).name==='สมชาย ใจดี'&&(await call(codes['ใหม่'],'99999')).name==='สมชาย ใจดี');
check('a teacher-added student cannot be renamed through a student code',(await setName('66001','ชื่อปลอม')).name==='มะลิ'&&(await call(codes['ใหม่'],'66001')).name==='มะลิ');
await call(codes['ใหม่'],'same-as-code');
check('a name equal to the code is still a confirmed name',(await setName('same-as-code','same-as-code')).status==='confirmed'&&(await call(codes['ใหม่'],'same-as-code')).needsName===false);
await call(codes['ใหม่'],'rename-me');
await db.exec('reset role');
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false); select set_config('request.jwt.claims','{"app_metadata":{"role":"teacher"}}',false);`);
await db.exec("update public.classroom_students set name = 'ชื่อจากครู' where student_code = 'rename-me'");
await db.exec('reset role');
await db.exec('set role anon');
const teacherNamed=await call(codes['ใหม่'],'rename-me');
check('a teacher rename confirms the name',teacherNamed.name==='ชื่อจากครู'&&teacherNamed.needsName===false);
await call(codes['ใหม่'],'still-pending');
await db.exec('reset role');
await db.exec(sql('student-access.sql'));
await db.exec('set role anon');
check('re-running the migration keeps pending and confirmed names as they were',(await call(codes['ใหม่'],'still-pending')).needsName===true&&(await call(codes['ใหม่'],'same-as-code')).needsName===false&&(await call(codes['ใหม่'],'99999')).name==='สมชาย ใจดี');
await call(codes['ใหม่'],'AbC1');await call(codes['ใหม่'],'abc1');

await db.exec('reset role');
check('codes differing only by case are one account',(await db.query("select count(*) n from public.classroom_students where class_id=$1 and lower(student_code)='abc1'",[NEW])).rows[0].n==1);
await db.exec('set role anon');
check('an existing student keeps their score after others join',(await call(codes['ใหม่'],'66001')).scores.pre.score===66.7);
check('over-long student code returns null',(await call(codes['ใหม่'],'x'.repeat(41)))===null);
check('blank student code returns null',(await call(codes['ใหม่'],'   '))===null);
check('unknown class code never creates anyone',(await call('ZZZZZZ','brand-new'))===null);
const evil=await call(codes['ใหม่'],"x');drop table classroom_students;--");
check('SQL-ish student code is stored as plain text',evil.name.startsWith("x');"));
await db.exec('reset role');
await db.exec(`insert into public.classroom_students(teacher_id,class_id,student_code,name) select '${A}','${NEW}','fill'||g,'fill' from generate_series(1,300-(select count(*) from public.classroom_students where class_id='${NEW}')::int) g`);
await db.exec('set role anon');
await db.exec('reset role');
const full=await count(NEW);
await db.exec('set role anon');
check('class was filled to 300 students',full===300);
check('a full class refuses new codes',(await call(codes['ใหม่'],'one-too-many'))===null);
check('a full class still admits known codes',(await call(codes['ใหม่'],'66001')).name==='มะลิ');
let insertDenied=false;
try{await db.exec(`insert into public.classroom_students(teacher_id,class_id,student_code,name) values ('${A}','${NEW}','direct','direct')`)}catch(error){insertDenied=/permission denied/.test(error.message)}
check('anon still cannot insert students directly',insertDenied);
check('wrong class code returns null',(await call('ZZZZZZ','66001'))===null);
check('empty codes return null',(await call('',''))===null);
check('SQL-ish input is treated as data',(await call("' or 1=1 --","' or 1=1 --"))===null);
check('no correct answers or prompts leak',!JSON.stringify(mali).includes('correct_option')&&!JSON.stringify(mali).includes('q1'));

const asRole=async(role,claims='{}')=>{await db.exec('reset role');if(role==='reset')return;await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${A}',false); select set_config('request.jwt.claims','${claims}',false);`)};
const teacher=()=>asRole('authenticated','{"app_metadata":{"role":"teacher"}}');
const denied=async(statement,pattern)=>{try{await db.exec(statement)}catch(error){return pattern.test(error.message)}return false};
const EX2=exercise('orders','SELECT COUNT(*) AS total FROM orders');
await teacher();
await db.query('update public.classroom_missions set exercise=$1::jsonb where id=$2',[JSON.stringify(EX2),M2]);
await asRole('anon');
const configured=await call(codes['ใหม่'],'66001');
check('a teacher who sets the exercise makes the mission playable, in creation order',configured.missions.map(m=>m.id).join()===[M1,M2,M3].join()&&configured.unconfiguredMissionCount===0&&isDeepStrictEqual(configured.missions[1].exercise,EX2));
await teacher();
await db.query("update public.classroom_missions set exercise=jsonb_set(exercise,'{hint}','\"ใบ้ใหม่\"') where id=$1",[M1]);
await asRole('anon');
check('an edited hint reaches the next student call',(await call(codes['ใหม่'],'66001')).missions[0].exercise.hint==='ใบ้ใหม่');
await teacher();
await db.query('update public.classroom_missions set exercise=null where id=$1',[M2]);
await asRole('anon');
const reverted=await call(codes['ใหม่'],'66001');
check('clearing the exercise takes the mission away from students again',reverted.missions.length===2&&reverted.unconfiguredMissionCount===1);
await teacher();
const badShapes={
 'not an object':'[]','no tables':JSON.stringify({...EX1,tables:[]}),'nine tables':JSON.stringify({...EX1,tables:Array(9).fill(EX1.tables[0])}),
 'wrong version':JSON.stringify({...EX1,version:2}),'blank answer':JSON.stringify({...EX1,answerSql:'  '}),'bad row order':JSON.stringify({...EX1,rowOrder:'sorted'}),
 'missing hint':JSON.stringify({...EX1,hint:undefined}),'over 600 KB':JSON.stringify({...EX1,hint:'x'.repeat(600001)})
};
for(const [label,value] of Object.entries(badShapes)){
 let rejected=false;
 try{await db.query('update public.classroom_missions set exercise=$1::jsonb where id=$2',[value,M1])}catch(error){rejected=/classroom_missions_exercise_shape/.test(error.message)}
 check(`the table refuses an exercise with ${label}`,rejected);
}
check('the refused updates left the mission row writable',(await db.query('update public.classroom_missions set exercise=exercise where id=$1 returning 1',[M1])).rows.length===1);
await asRole('authenticated','{"app_metadata":{"role":"student"}}');
check('a signed-in user without the teacher role sees no missions',(await db.query('select id from public.classroom_missions')).rows.length===0);
check('and cannot write an exercise',(await db.query('update public.classroom_missions set exercise=null where id=$1 returning 1',[M1])).rows.length===0);
check('or add a mission',await denied(`insert into public.classroom_missions(teacher_id,class_id,title,topic,difficulty,exercise) values ('${A}','${NEW}','x','SELECT','easy','${JSON.stringify(EX1)}')`,/row-level security/));
await asRole('anon');
check('anon cannot write an exercise',await denied(`update public.classroom_missions set exercise=null where id='${M1}'`,/permission denied/));
await asRole('reset');
await db.exec(sql('teacher-missions.sql'));
await db.exec(sql('student-access.sql'));
await asRole('anon');
const rerun=await call(codes['ใหม่'],'66001');
check('re-running both migrations keeps the exercises students already see',isDeepStrictEqual(rerun,reverted));

for(const table of ['classroom_groups','classroom_students','classroom_quiz_questions','classroom_quiz_attempts','classroom_results','classroom_missions']){
 let denied=false;
 try{await db.query(`select * from public.${table}`)}catch(error){denied=/permission denied/.test(error.message)}
 check(`anon cannot read ${table} directly`,denied);
}
await db.exec('reset role');
console.log('all ok');
