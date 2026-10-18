// Usage: node verify/mission-flow.mjs [outDir]
// Needs: npx vite --config verify/vite.config.ts (serves / and /student.html on :5199) and the PGlite install described in student-access-check.mjs.
// Teacher authors a mission in the real editor, that exact payload goes through the real SQL (RLS, check constraint, student_classroom),
// and the real student lab plays the reply. Nothing between the two screens is hand-written.
import {createRequire} from 'node:module';
import {readFileSync, mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const {PGlite}=createRequire('/tmp/pgtest/')('@electric-sql/pglite');
const [out='/tmp/mission-flow']=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const sql=name=>readFileSync(new URL(`../supabase/${name}`,import.meta.url),'utf8');

const T='00000000-0000-0000-0000-00000000000a',CLASS='22222222-2222-2222-2222-222222222222',CODE='AB3K9Z';
const db=new PGlite();
await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
 grant usage on schema public, auth to anon, authenticated;
 insert into auth.users values ('${T}');
`);
for(const file of ['teacher-dashboard.sql','teacher-quizzes.sql','teacher-missions.sql','student-access.sql'])await db.exec(sql(file));
await db.exec(`insert into public.classroom_groups(id,teacher_id,name,join_code) values ('${CLASS}','${T}','ห้องทดสอบ','${CODE}');
 insert into public.classroom_students(teacher_id,class_id,student_code,name) values ('${T}','${CLASS}','66001','มะลิ');
 insert into public.classroom_missions(teacher_id,class_id,title,topic,difficulty) values ('${T}','${CLASS}','ภารกิจเก่าที่ยังไม่มีข้อมูล','SELECT','easy');`);
const asTeacher=()=>db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${T}',false); select set_config('request.jwt.claims','{"app_metadata":{"role":"teacher"}}',false);`);
const classroom=async()=>{await db.exec('reset role; set role anon');return (await db.query('select public.student_classroom($1,$2) as r',[CODE,'66001'])).rows[0].r};

const browser=await chromium.launch({channel:'chrome'});
const problems=[];
const track=page=>{page.on('pageerror',e=>problems.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')problems.push('console: '+m.text())})};
const step=(label)=>console.log('ok  '+label);

// 1. Teacher authors a mission in the real editor.
const teacherPage=await browser.newPage({viewport:{width:1586,height:992}});
track(teacherPage);
await teacherPage.goto('http://localhost:5199/');
await teacherPage.waitForSelector('.td-app');
await teacherPage.waitForFunction(()=>!document.querySelector('.td-spin'));
await teacherPage.locator('.td-sidebar nav button',{hasText:'ภารกิจ'}).click();
await teacherPage.getByRole('button',{name:'สร้างภารกิจ'}).click();
const dialog=teacherPage.locator('dialog[open]');
await dialog.getByLabel('ชื่อภารกิจ').fill('สินค้าราคาสูง');
await dialog.getByLabel('โจทย์สำหรับนักเรียน').fill('แสดงชื่อและราคาสินค้าที่ราคาอย่างน้อย 25 บาท เรียงจากแพงไปถูก');
await dialog.getByRole('button',{name:'โหลดตัวอย่างตารางสินค้า'}).click();
await dialog.getByLabel('คำตอบ SQL').fill('SELECT name, price FROM products WHERE price >= 25 ORDER BY price DESC;');
await dialog.getByLabel('ตรวจลำดับแถวด้วย').check();
await dialog.getByRole('button',{name:'ตรวจสอบและดูผลเฉลย'}).click();
await dialog.getByRole('status').filter({hasText:'พร้อมใช้'}).waitFor();
const expected=await dialog.locator('.mission-preview table').last().innerText();
assert.match(expected,/กระเป๋า\s+250\s+สมุด\s+25/,'the editor preview shows the answer rows in the teacher order');
step('teacher editor runs the answer on the teacher tables and previews the expected rows');
const authored={
 title:await dialog.locator('input[name=title]').inputValue(),description:await dialog.locator('textarea[name=description]').inputValue(),
 topic:await dialog.locator('select[name=topic]').inputValue(),difficulty:await dialog.locator('select[name=difficulty]').inputValue(),
 exercise:JSON.parse(await dialog.locator('input[name=exercise]').inputValue())
};
await teacherPage.screenshot({path:`${out}/teacher-editor.png`});
await dialog.getByRole('button',{name:'บันทึกข้อมูล'}).click();
await teacherPage.getByText('สินค้าราคาสูง').first().waitFor();
step('teacher saves; the mission is listed');

// 2. The payload goes through the real SQL.
await asTeacher();
await db.query("insert into public.classroom_missions(teacher_id,class_id,title,topic,difficulty,description,exercise) values ($1,$2,$3,$4,$5,$6,$7::jsonb)",[T,CLASS,authored.title,authored.topic,authored.difficulty,authored.description,JSON.stringify(authored.exercise)]);
let reply=await classroom();
assert.equal(reply.missions.length,1);
assert.equal(reply.unconfiguredMissionCount,1);
step('Postgres accepts the editor payload; the student reply has 1 playable and 1 unconfigured mission');

// 3. A student plays it.
const RPC='http://localhost:54321/rest/v1/rpc/student_classroom';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
const student=await browser.newPage({viewport:{width:1568,height:982}});
track(student);
await student.route(RPC,route=>route.request().method()==='OPTIONS'?route.fulfill({status:204,headers:cors}):route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(reply)}));
await student.addInitScript(()=>{if(!localStorage.getItem('sql-student-codes'))localStorage.setItem('sql-student-codes',JSON.stringify({classCode:'AB3K9Z',studentCode:'66001'}))});
await student.goto('http://localhost:5199/student.html');
const desks=student.locator('.student-desk');
await desks.first().waitFor();
await student.screenshot({path:`${out}/student-room.png`});
assert.equal(await desks.count(),1);
assert.match(await student.locator('.student-profile-card').innerText(),/ครูกำลังเตรียมข้อมูลอีก 1 ภารกิจ/);
assert.equal(await desks.first().isDisabled(),false);
step('student sees only the configured mission, plus a note that one is being prepared');

await desks.first().click();
const lab=student.locator('.lab-mission');
await lab.getByText('ตาราง: products').waitFor();
assert.match(await lab.innerText(),/แสดงชื่อและราคาสินค้าที่ราคาอย่างน้อย 25 บาท/);
const sampleRows=await lab.locator('.lab-sample-table tbody tr').allInnerTexts();
assert.deepEqual(sampleRows.map(r=>r.split('\t')),authored.exercise.tables[0].rows.map(r=>r.map(String)));
step('lab shows the teacher task text and exactly the teacher sample rows');

const words=authored.exercise.answerSql.trim().split(/\s+/);
const pool=student.locator('.arrange-pool');
for(const word of words)await pool.locator('button:not(:disabled)').filter({hasText:new RegExp('^'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).first().click();
await student.getByRole('button',{name:'ตรวจลำดับ'}).click();
await student.locator('.lab-banner.is-right').waitFor();
step('arrange step is built from the teacher answer');
await student.getByRole('button',{name:/ไปเขียนเอง/}).click();
await student.waitForFunction(()=>!document.querySelector('.lab-run[disabled]'));
const editor=student.getByLabel('เขียนคำสั่ง SQL');
assert.equal(await editor.inputValue(),authored.exercise.starterSql);
step('editor starts with the teacher starter SQL');

const run=async text=>{await editor.fill(text);await editor.press('Control+Enter')};
await run('SELECT name, price FROM products WHERE price >= 25');
await student.locator('.lab-banner.is-wrong').waitFor();
step('right rows in the wrong order is refused because the teacher asked for exact order');
await run('DROP TABLE products');
await student.locator('.lab-banner.is-error').waitFor();
await run('SELECT name, price FROM products WHERE price >= 25 ORDER BY price DESC');
await student.locator('.lab-banner.is-right').waitFor();
assert.match(await student.locator('.lab-banner').innerText(),/100 XP/);
await student.screenshot({path:`${out}/student-solved.png`,fullPage:true});
step('a different query with the same rows in order passes and earns XP; DROP is refused');

await student.reload();
await desks.first().waitFor();
assert.match(await desks.first().getAttribute('class'),/is-done/);
step('completion survives a reload');

// 4. The teacher edits the task; the student owes it again.
await asTeacher();
await db.query("update public.classroom_missions set description=$1 where title=$2",['แสดงสินค้าราคาอย่างน้อย 25 บาท (แก้ไขโจทย์)',authored.title]);
reply=await classroom();
await student.reload();
await desks.first().waitFor();
assert.doesNotMatch(await desks.first().getAttribute('class'),/is-done/);
step('after the teacher edits the task text the mission is open again');

// 5. The teacher finishes the old mission; it joins the room.
await asTeacher();
await db.query("update public.classroom_missions set exercise=$1::jsonb where title='ภารกิจเก่าที่ยังไม่มีข้อมูล'",[JSON.stringify({...authored.exercise,answerSql:'SELECT COUNT(*) AS n FROM products',rowOrder:'any'})]);
reply=await classroom();
await student.reload();
await desks.nth(1).waitFor();
assert.equal(await desks.count(),2);
assert.equal(await student.locator('.student-profile-card').getByText(/ครูกำลังเตรียม/).count(),0);
step('configuring the old mission adds it as the second desk and clears the notice');

await browser.close();
console.log(problems.length?'PROBLEMS\n'+problems.join('\n'):'all ok, no console errors');
process.exitCode=problems.length?1:0;
