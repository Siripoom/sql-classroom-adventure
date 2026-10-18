// Usage: node verify/lab-shoot.mjs <outDir>   (needs: npx vite --config verify/vite.config.ts)
// Opens lesson 1 in the SQL lab, shoots it empty, wrong, and solved, at several widths.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
const {chromium}=createRequire(import.meta.url)(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const [out='/tmp/lab-shots']=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const RPC='http://localhost:54321/rest/v1/rpc/student_classroom';
const room={name:'มะลิ',missionTopics:['SELECT','WHERE','ORDER BY','GROUP BY','JOIN'],questionCounts:{pre:0,post:0},scores:{pre:null,post:null}};
const words=a=>a.trim().split(/\s+/);
const arrange=async(page,answer)=>{for(const w of words(answer))await page.locator('.arrange-pool button:not(:disabled)').filter({hasText:new RegExp('^'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).first().click()};
const browser=await chromium.launch({channel:'chrome'});
const problems=[];
const bad=(w,label)=>problems.push(`${w}: ${label}`);
for(const [w,h] of [[1568,982],[1366,768],[1024,768],[390,844]]){
 const page=await browser.newPage({viewport:{width:w,height:h}});
 page.on('pageerror',e=>problems.push(`${w}: pageerror ${e.message}`));
 await page.route(RPC,route=>{const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(room)})});
 await page.addInitScript(()=>localStorage.setItem('sql-student-codes',JSON.stringify({classCode:'AB3K9Z',studentCode:'66001'})));
 await page.goto('http://localhost:5199/student.html');
 await page.waitForSelector('.student-room');
 await page.locator('.student-desk[data-desk=lesson-1]').click();
 await page.waitForSelector('.practice');
 await page.waitForFunction(()=>!document.querySelector('.lab-run[disabled]')||document.querySelector('.arrange-pool'));
 await page.screenshot({path:`${out}/lab-phase1-empty-${w}.png`,fullPage:true});
 // phase 1: tap the words
 const ANSWER='SELECT * FROM students';
 const stepTwo=page.locator('.lab-steps li').nth(1).locator('button');
 if(!(await stepTwo.isDisabled()))bad(w,'step 2 is open before the order is right');
 if(await page.locator('textarea').count())bad(w,'editor is visible in phase 1');
 if((await page.locator('.arrange-pool button').allInnerTexts()).join(' ')===ANSWER)bad(w,'pool starts in solved order');
 if(w===1568){
  if(!(await page.locator('.lab-run').isDisabled()))bad(w,'check button is enabled with nothing placed');
  const pool=await page.locator('.arrange-pool button').allInnerTexts();
  await page.locator('.arrange-pool button').first().click();
  await page.locator('.lab-run').click();
  await page.waitForSelector('.lab-banner.is-wrong');
  if(!(await page.locator('.lab-banner').innerText()).includes('ยังเรียงไม่ครบ'))bad(w,'partial order is not called incomplete');
  await page.locator('.arrange-line .arrange-chip').first().click();
  if(await page.locator('.arrange-line .arrange-chip').count())bad(w,'tapping a placed word does not remove it');
  if(await page.locator('.lab-banner:not(:empty)').count())bad(w,'banner stays after the order changed');
  // a full but wrong order: tap the pool in its given order (never the solved one)
  for(let i=0;i<pool.length;i++)await page.locator('.arrange-pool button:not(:disabled)').first().click();
  await page.locator('.lab-run').click();
  await page.waitForSelector('.lab-banner.is-wrong');
  if(!(await page.locator('.lab-banner').innerText()).includes('ลำดับยังไม่ถูก'))bad(w,'wrong order is not called wrong');
  await page.screenshot({path:`${out}/lab-phase1-wrong-${w}.png`,fullPage:true});
  if(!(await stepTwo.isDisabled()))bad(w,'step 2 opened on a wrong order');
  await page.locator('.lab-clear').click();
 }
 await arrange(page,ANSWER);
 await page.screenshot({path:`${out}/lab-phase1-placed-${w}.png`,fullPage:true});
 await page.locator('.lab-run').click();
 await page.waitForSelector('.lab-banner.is-right');
 if(await stepTwo.isDisabled())bad(w,'step 2 stays locked after the right order');
 await page.screenshot({path:`${out}/lab-phase1-right-${w}.png`,fullPage:true});
 await page.getByRole('button',{name:/ไปเขียนเอง/}).click();
 await page.waitForSelector('textarea');
 await page.waitForFunction(()=>!document.querySelector('.lab-run[disabled]'));
 await page.screenshot({path:`${out}/lab-empty-${w}.png`,fullPage:true});
 await page.locator('textarea').fill('SELECT * FROM students;');
 await page.locator('.practice').getByRole('button',{name:/รัน/}).first().click();
 await page.waitForSelector('[role=status]');
 await page.waitForTimeout(300);
 await page.screenshot({path:`${out}/lab-solved-${w}.png`,fullPage:true});

 // behavior checks, once
 if(w===1568){
  const text=()=>page.locator('.lab-banner').innerText();
  await page.locator('textarea').fill('SELECT name FROM students');
  await page.locator('textarea').press('Control+Enter');
  await page.waitForSelector('.lab-banner.is-wrong');
  if(!(await page.locator('.lab-badge.is-warn').count()))bad(w,'wrong answer shows no warn badge');
  if(await page.locator('.lab-next').count())bad(w,'next button shows for a wrong answer');
  await page.screenshot({path:`${out}/lab-wrong-${w}.png`,fullPage:true});
  await page.locator('textarea').fill('DROP TABLE students');
  await page.locator('textarea').press('Control+Enter');
  await page.waitForSelector('.lab-banner.is-error');
  if(await page.locator('.lab-result tbody tr').count())bad(w,'old rows stay after an error');
  await page.screenshot({path:`${out}/lab-error-${w}.png`,fullPage:true});
  await page.locator('.lab-clear').click();
  if((await page.locator('textarea').inputValue())!==''||await page.locator('.lab-banner:not(:empty)').count())bad(w,'clear leaves text or banner');
  const many=Array.from({length:30},(_,i)=>`-- line ${i+1} `+'x'.repeat(i*6)).join('\n');
  await page.locator('textarea').fill(many+"\nSELECT 'a' FROM t;");
  const m=await page.evaluate(()=>{const t=document.querySelector('.lab-text textarea'),p=document.querySelector('.lab-text pre'),g=document.querySelector('.lab-gutter');return {tw:t.scrollWidth,pw:p.scrollWidth,th:t.scrollHeight,ph:p.scrollHeight,gh:g.scrollHeight,gutterNums:g.children.length}});
  if(Math.abs(m.th-m.ph)>2)bad(w,`highlight layer height ${m.ph} != textarea ${m.th}`);
  if(m.gutterNums!==31)bad(w,`gutter has ${m.gutterNums} numbers, expected 31`);
  await page.locator('textarea').evaluate(t=>{t.scrollTop=200;t.scrollLeft=300;t.dispatchEvent(new Event('scroll'))});
  const sync=await page.evaluate(()=>[document.querySelector('.lab-gutter').scrollTop,document.querySelector('.lab-text pre').scrollTop,document.querySelector('.lab-text textarea').scrollTop,document.querySelector('.lab-text pre').scrollLeft,document.querySelector('.lab-text textarea').scrollLeft]);
  if(!(sync[0]===sync[1]&&sync[1]===sync[2]&&sync[0]>0&&sync[3]===sync[4]&&sync[4]>0))bad(w,`scroll not in sync ${sync}`);
  await page.locator('.lab-hint .secondary').click();
  if(!(await page.locator('.lab-hint p').innerText()).includes('SELECT'))bad(w,'hint text not shown');
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 if(overflow>0)problems.push(`${w}: horizontal overflow ${overflow}px`);
 await page.getByRole('button',{name:/กลับ/}).click();
 await page.waitForSelector('.student-room');
 await page.locator('.student-desk[data-desk=lesson-6]').click();
 await page.waitForSelector('.arrange-pool');
 const L6='SELECT students.name, clubs.title FROM students JOIN clubs ON students.club_id = clubs.id'.split(' ');
 for(const word of L6.slice(0,7))await page.locator('.arrange-pool button:not(:disabled)').filter({hasText:new RegExp('^'+word.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+'$')}).first().click();
 await page.screenshot({path:`${out}/lab-phase1-l6-${w}.png`,fullPage:true});
 const o6=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 if(o6>0)bad(w,`lesson 6 phase 1 overflows ${o6}px`);
 await page.close();
}
await browser.close();
console.log(problems.length?problems.join('\n'):'ok');
