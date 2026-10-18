// Usage: node verify/student-shoot.mjs <outDir>
// Needs: npx vite --config verify/vite.config.ts (serves /student.html)
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';

const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const [out='/tmp/student-shots']=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const RPC='http://localhost:54321/rest/v1/rpc/student_classroom';
const emptyClass={name:'มะลิ',needsName:false,missionTopics:['SELECT','WHERE','ORDER BY','GROUP BY','JOIN'],questionCounts:{pre:0,post:0},attempted:{pre:false,post:false},scores:{pre:null,post:null}};
const partialClass={name:'มะลิ',needsName:false,missionTopics:['SELECT','WHERE'],questionCounts:{pre:3,post:0},attempted:{pre:true,post:false},scores:{pre:{correct:2,total:3,score:66.7},post:null}};
const answerWith=async(page,reply,calls=[])=>page.route(RPC,route=>{
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
 const body=route.request().postDataJSON();calls.push(body);
 const known=body.p_class_code==='AB3K9Z'&&body.p_student_code==='66001';
 route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(known?reply:null)});
});
const signedIn=()=>localStorage.setItem('sql-student-codes',JSON.stringify({classCode:'AB3K9Z',studentCode:'66001'}));
const browser=await chromium.launch({channel:'chrome'});
const problems=[];
for(const [w,h] of [[1568,982],[1920,1080],[2560,1080],[1366,768],[1280,720],[1024,700],[390,844]]){
 const page=await browser.newPage({viewport:{width:w,height:h}});
 page.on('response',r=>{if(r.status()>=400)problems.push(`${w}: ${r.status()} ${r.url()}`)});
 page.on('pageerror',e=>problems.push(`${w}: pageerror: ${e.message}`));
 await answerWith(page,emptyClass);
 await page.addInitScript(signedIn);
 await page.goto('http://localhost:5199/student.html');
 await page.waitForSelector('.student-room');
 await page.waitForFunction(()=>document.querySelector('.student-room-image').complete);
 const check=async(label,ok)=>{if(!ok)problems.push(`${w}: ${label}`)};
 await check('expected 1 menu',await page.locator('.student-sidebar nav button').count()===1);
 await check('expected 8 desks',await page.locator('.student-desk').count()===8);
 await check('only the first lesson is open when the class has no quiz',await page.locator('.student-desk:not(:disabled)').count()===1&&await page.locator('.student-desk[data-desk=lesson-1]:not(:disabled)').count()===1);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 await check(`horizontal overflow ${overflow}px`,overflow<=0);
 if(w>=1024){
  const m=await page.evaluate(()=>{const room=document.querySelector('.student-room').getBoundingClientRect();const card=document.querySelector('.student-profile-card').getBoundingClientRect();const desks=[...document.querySelectorAll('.student-desk')].map(d=>d.getBoundingClientRect());return {page:document.documentElement.scrollHeight,view:innerHeight,roomBottom:room.bottom,cardBottom:card.bottom,hidden:desks.filter(r=>r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth).length,cropped:desks.filter(r=>r.top<room.top||r.bottom>room.bottom||r.left<room.left||r.right>room.right).length,roomW:room.width,cardW:card.width,canvasW:document.querySelector('.student-room-canvas').getBoundingClientRect().width,canvasH:document.querySelector('.student-room-canvas').getBoundingClientRect().height,scrollable:document.querySelector('.student-profile-card').scrollHeight-document.querySelector('.student-profile-card').clientHeight}});
  await check(`page must fit the screen (${m.page}/${m.view})`,m.page<=m.view);
  await check(`all 8 desks visible (${m.hidden} outside viewport)`,m.hidden===0);
  await check(`all 8 desks inside the room frame (${m.cropped} cropped)`,m.cropped===0);
  await check(`image keeps its aspect ratio (${(m.canvasW/m.canvasH).toFixed(3)})`,Math.abs(m.canvasW/m.canvasH-2454/1558)<0.01);
  await check(`image covers the room (${Math.round(m.canvasW)} < ${Math.round(m.roomW)})`,m.canvasW>=m.roomW-8);
  if(w>=1280)await check(`room wider than profile card (${Math.round(m.roomW)} vs ${Math.round(m.cardW)})`,m.roomW>m.cardW*1.3);
  await check(`profile card needs no scrolling (${m.scrollable}px)`,m.scrollable<=0);
 }
 await page.screenshot({path:`${out}/home-${w}.png`,fullPage:true});
 if(w===1568){
  await page.locator('.student-desk[data-desk=lesson-1]').click();
  await page.waitForSelector('.practice');
  for(const word of 'SELECT * FROM students'.split(' '))await page.locator('.arrange-pool button:not(:disabled)').filter({hasText:new RegExp('^'+word.replace(/[*]/g,'\\*')+'$')}).first().click();
  await page.locator('.lab-run').click();
  await page.getByRole('button',{name:/ไปเขียนเอง/}).click();
  await page.waitForSelector('textarea');
  await page.waitForFunction(()=>!document.querySelector('.lab-run[disabled]'));
  await page.locator('textarea').fill('SELECT * FROM students');
  await page.getByRole('button',{name:/รันคำสั่ง/}).click();
  await page.waitForSelector('[role=status]:has-text("ถูกต้อง")');
  await page.getByRole('button',{name:/กลับ/}).click();
  await page.waitForSelector('.student-room');
  await check('solved lesson shows done desk',await page.locator('.student-desk.is-done').count()===1);
  await check('profile shows 1/6 passed',(await page.locator('.student-profile-row b').innerText())==='1/6');
  await page.screenshot({path:`${out}/home-solved.png`,fullPage:true});
 }
 await page.close();
}

// Partial teacher data: pre-test is done, post-test has no questions, only SELECT/WHERE missions exist.
{
 const page=await browser.newPage({viewport:{width:1568,height:982}});
 await answerWith(page,partialClass);
 await page.addInitScript(signedIn);
 await page.goto('http://localhost:5199/student.html');
 await page.waitForSelector('.student-room');
 const state=id=>page.locator(`.student-desk[data-desk=${id}]`);
 const flag=async(label,ok)=>{if(!ok)problems.push('partial: '+label)};
 await flag('pre-test done and unlocked',await state('pre').evaluate(el=>el.classList.contains('is-done')&&!el.disabled));
 await flag('post-test locked',await state('post').isDisabled());
 await flag('lesson 1 open, lessons 2-3 wait for it',!(await state('lesson-1').isDisabled())&&(await Promise.all([2,3].map(n=>state('lesson-'+n).isDisabled()))).every(Boolean));
 await flag('lessons 4-6 locked (no mission)',(await Promise.all([4,5,6].map(n=>state('lesson-'+n).isDisabled()))).every(Boolean));
 await flag('pre-test score 66.7% shown',(await page.locator('.student-quiz-score').first().innerText()).includes('66.7%'));
 await page.screenshot({path:`${out}/home-partial.png`,fullPage:true});
 await page.close();
}

// Sign-in form: wrong codes are refused, right codes (typed loosely) enter the classroom and are remembered.
{
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const calls=[];
 await answerWith(page,partialClass,calls);
 await page.goto('http://localhost:5199/student.html');
 const flag=async(label,ok)=>{if(!ok)problems.push('login: '+label)};
 await page.getByRole('button',{name:/นักเรียน/}).click();
 await page.getByLabel('รหัสห้องเรียน').fill('zzzzzz');
 await page.getByLabel('รหัสนักเรียน').fill('66001');
 await page.getByRole('button',{name:/เข้าสู่ห้องเรียน/}).click();
 await page.waitForSelector('.login-error');
 await flag('wrong class code shows an error and stays on the form',await page.locator('.student-room').count()===0&&(await page.locator('.login-error').innerText()).includes('ไม่ถูกต้อง'));
 await page.screenshot({path:`${out}/login-wrong.png`});
 await page.getByLabel('รหัสห้องเรียน').fill(' ab3k9z ');
 await page.getByRole('button',{name:/เข้าสู่ห้องเรียน/}).click();
 await page.waitForSelector('.student-room');
 await flag('class code is sent upper-case and trimmed',calls.at(-1)?.p_class_code==='AB3K9Z'&&calls.at(-1)?.p_student_code==='66001');
 await flag('classroom greets the student by name from the database',(await page.locator('.student-profile-top h2').innerText())==='มะลิ');
 await page.reload();
 await page.waitForSelector('.student-room');
 await flag('reload stays signed in',await page.locator('.student-desk').count()===8);
 await page.getByRole('button',{name:/ออกจากระบบ/}).click();
 await page.waitForSelector('.classroom-login');
 await flag('sign out returns to the form and forgets the codes',await page.evaluate(()=>localStorage.getItem('sql-student-codes'))===null);
 await page.close();
}
await browser.close();
console.log(problems.length?'PROBLEMS\n'+problems.join('\n'):'ok');
