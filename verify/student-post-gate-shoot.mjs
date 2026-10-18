import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const browser=await chromium.launch({channel:'chrome'});
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
const reply=(attemptedPre,topics)=>({name:'มะลิ',needsName:false,missionTopics:topics,questionCounts:{pre:2,post:2},attempted:{pre:attemptedPre,post:false},scores:{pre:attemptedPre?{correct:1,total:2,score:50}:null,post:null}});
async function open(codes,attemptedPre,completed={},topics=['SELECT','JOIN']){
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.route('**/rest/v1/rpc/*',route=>route.request().method()==='OPTIONS'?route.fulfill({status:204,headers:cors}):route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(reply(attemptedPre,topics))}));
 await page.addInitScript(([signedIn,progress])=>{localStorage.setItem('sql-student-codes',JSON.stringify(signedIn));for(const [key,ids] of Object.entries(progress))localStorage.setItem(key,JSON.stringify(ids))},[codes,completed]);
 await page.goto('http://localhost:5199/student.html');
 await page.locator('[data-desk="post"]').waitFor();
 return page;
}
const states=async page=>Object.fromEntries(await page.locator('.student-desk').evaluateAll(buttons=>buttons.map(button=>[button.dataset.desk,button.disabled?'locked':button.classList.contains('is-done')?'done':'open'])));
const mali={classCode:'AB3K9Z',studentCode:'66001'};

const key='sql-completed:AB3K9Z:66001';
const locked=(extra={})=>({pre:'done','lesson-1':'locked','lesson-2':'locked','lesson-3':'locked','lesson-4':'locked','lesson-5':'locked','lesson-6':'locked',post:'locked',...extra});

const fresh=await open(mali,false);
assert.deepEqual(await states(fresh),locked({pre:'open'}),'a new student can only start the pre-test');
assert.equal(await fresh.locator('.student-desk.is-current').getAttribute('data-desk'),'pre','pre-test is the current desk');
assert.match(await fresh.locator('[data-desk="lesson-1"]').getAttribute('aria-label'),/ต้องผ่าน Pre-test ก่อน/,'a locked lesson names the desk to finish first');
assert.equal(await fresh.locator('.student-profile-row b').innerText(),'0/6','a new student has no lessons passed');
await fresh.close();

const afterPre=await open(mali,true);
assert.deepEqual(await states(afterPre),locked({'lesson-1':'open'}),'finishing the pre-test opens lesson 1 only');
assert.equal(await afterPre.locator('.student-post-wait').innerText(),'ต้องผ่าน JOIN ก่อนปลดล็อก Post-test','profile names the JOIN lesson as the gate');
await afterPre.close();

const midway=await open(mali,true,{[key]:[1]});
assert.deepEqual(await states(midway),locked({'lesson-1':'done','lesson-2':'open'}),'lesson 2 opens after lesson 1');
await midway.close();

const beforeJoin=await open(mali,true,{[key]:[1,2]});
assert.deepEqual(await states(beforeJoin),locked({'lesson-1':'done','lesson-2':'done','lesson-6':'open'}),'JOIN opens once the lessons the class has are done, and the post-test still waits');
assert.match(await beforeJoin.locator('[data-desk="post"]').getAttribute('aria-label'),/ต้องผ่าน JOIN ก่อน/,'the locked post-test says JOIN is next');
await beforeJoin.close();

const finished=await open(mali,true,{[key]:[1,2,6]});
assert.equal((await states(finished))['post'],'open','post-test opens as soon as the JOIN lesson is done');
assert.equal(await finished.locator('.student-post-wait').count(),0,'the waiting note is gone');
assert.equal(await finished.locator('.student-desk.is-current').getAttribute('data-desk'),'post','post-test is the current desk');
await finished.close();

const noJoin=await open(mali,true,{[key]:[1,2]},['SELECT']);
assert.equal((await states(noJoin))['post'],'locked','without a JOIN mission the post-test stays locked');
assert.equal(await noJoin.locator('.student-post-wait').innerText(),'ครูยังไม่เปิดบท JOIN จึงยังทำ Post-test ไม่ได้','and the student is told why');
await noJoin.close();

const other=await open({classCode:'AB3K9Z',studentCode:'66002'},true,{[key]:[1,2,6]});
assert.equal((await states(other))['lesson-1'],'open','another student on the same browser does not inherit passed lessons');
assert.equal((await states(other))['post'],'locked','nor the unlocked post-test');
assert.equal(await other.locator('.student-profile-row b').innerText(),'0/6','and starts at 0/6');
await other.close();

await browser.close();
console.log('desk order, JOIN gate and per-student progress passed');
