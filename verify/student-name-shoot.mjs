import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const browser=await chromium.launch({channel:'chrome'});
const problems=[];
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};

const student=await browser.newPage({viewport:{width:1280,height:800}});
student.on('pageerror',error=>problems.push(`student page error: ${error.message}`));
let stored={name:'70002',needsName:true};
const setNameCalls=[];
await student.route('**/rest/v1/rpc/*',async route=>{
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
 const name=route.request().url().split('/').pop();
 let body;
 if(name==='student_set_name'){
  const sent=route.request().postDataJSON();setNameCalls.push(sent);
  if(stored.needsName){stored={name:sent.p_name,needsName:false}}
  body={status:'confirmed',name:stored.name};
 }else body={name:stored.name,needsName:stored.needsName,missionTopics:['SELECT'],questionCounts:{pre:0,post:0},attempted:{pre:false,post:false},scores:{pre:null,post:null}};
 await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(body)});
});
await student.addInitScript(()=>localStorage.setItem('sql-student-codes',JSON.stringify({classCode:'AB3K9Z',studentCode:'70002'})));
await student.goto('http://localhost:5199/student.html');
const dialog=student.locator('dialog.student-name-dialog[open]');
await dialog.waitFor();
assert.ok(await dialog.getByRole('button',{name:'บันทึกและเข้าห้องเรียน'}).isDisabled(),'save is disabled while the name is blank');
await student.keyboard.press('Escape');
assert.equal(await dialog.count(),1,'Escape does not dismiss the name dialog');
assert.equal(await dialog.locator('input').evaluate(element=>document.activeElement===element),true,'name field has focus on open');
await dialog.locator('input').fill('   ');
assert.ok(await dialog.getByRole('button',{name:'บันทึกและเข้าห้องเรียน'}).isDisabled(),'spaces alone cannot be saved');
await dialog.locator('input').fill('  นายสมชาย    ใจดี ');
await dialog.getByRole('button',{name:'บันทึกและเข้าห้องเรียน'}).click();
await student.waitForSelector('dialog.student-name-dialog',{state:'detached'});
assert.deepEqual(setNameCalls.map(call=>call.p_name),['นายสมชาย ใจดี'],'the cleaned name is what reaches the server');
assert.equal(await student.locator('.student-profile-top h2').innerText(),'นายสมชาย ใจดี','profile shows the typed name');
await student.reload();
await student.waitForSelector('.student-room');
assert.equal(await student.locator('dialog.student-name-dialog').count(),0,'no dialog once the name is stored');
assert.equal(await student.locator('.student-profile-top h2').innerText(),'นายสมชาย ใจดี','name survives a reload');

stored={name:'70002',needsName:true};
await student.reload();
await student.locator('dialog.student-name-dialog[open]').waitFor();
await student.getByRole('button',{name:'ใช้รหัสนักเรียนอื่น'}).click();
await student.waitForSelector('.classroom-login');
assert.equal(await student.evaluate(()=>localStorage.getItem('sql-student-codes')),null,'switching student forgets the codes');
await student.close();

const teacher=await browser.newPage({viewport:{width:1280,height:900}});
teacher.on('pageerror',error=>problems.push(`teacher page error: ${error.message}`));
await teacher.goto('http://localhost:5199/');
await teacher.waitForSelector('.td-app');
await teacher.waitForFunction(()=>!document.querySelector('.td-spin'));
await teacher.getByLabel('เลือกห้องเรียน').selectOption('c3');
await teacher.locator('.td-sidebar nav button',{hasText:'นักเรียน'}).first().click();
await teacher.getByText('นางสาวมะลิ ชื่อแล้ว').waitFor();
assert.equal(await teacher.locator('.td-name-pending').count(),1,'only the student without a name shows the pending badge');
assert.equal(await teacher.locator('tr',{hasText:'70002'}).locator('.td-name-pending').innerText(),'รอนักเรียนระบุชื่อ','badge sits on the pending student');
assert.equal(await teacher.locator('tr',{hasText:'นางสาวมะลิ ชื่อแล้ว'}).locator('.td-name-pending').count(),0,'a named student has no badge');
assert.match(await teacher.locator('.td-name-note').innerText(),/^1 คนเข้าห้องแล้วแต่ยังไม่ได้ระบุชื่อ/,'summary note counts pending students');
await teacher.getByLabel('เลือกห้องเรียน').selectOption('c2');
assert.equal(await teacher.locator('.td-name-pending').count(),0,'a class with only named students shows no badge');
assert.equal(await teacher.locator('.td-name-note').count(),0,'and no summary note');
await teacher.close();

await browser.close();
assert.equal(problems.length,0,problems.join('\n'));
console.log('student name flow passed');
