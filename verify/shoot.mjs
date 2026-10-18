// Usage: node verify/shoot.mjs <outDir> [width] [height]
// Needs the fixture server: npx vite --config verify/vite.config.ts
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';

const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const [out='/tmp/td-shots',width='1586',height='992']=process.argv.slice(2);
mkdirSync(out,{recursive:true});

const pages=[['overview','ภาพรวม'],['classes','ห้องเรียน'],['students','นักเรียน'],['missions','ภารกิจ'],['quizzes','แบบทดสอบ'],['reports','รายงาน']];
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:+width,height:+height}});
const problems=[];
page.on('console',m=>{if(m.type()==='error')problems.push('console: '+m.text())});
page.on('pageerror',e=>problems.push('pageerror: '+e.message));
await page.goto('http://localhost:5199/');
await page.waitForSelector('.td-app');
await page.waitForFunction(()=>!document.querySelector('.td-spin'));
for(const [id,label] of pages){
 await page.locator('.td-sidebar nav button',{hasText:label}).click();
 await page.waitForTimeout(400);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 if(overflow>0)problems.push(`${id}: horizontal overflow ${overflow}px`);
 await page.screenshot({path:`${out}/${id}.png`,fullPage:true});
 console.log('shot',id);
 if(id==='quizzes')for(const [tab,name] of [['pre','quizzes-pre'],['post','quizzes-post'],['results','quizzes-results']]){await page.getByRole('tab',{name:tab==='results'?'ผลลัพธ์':tab==='pre'?'ก่อนเรียน':'หลังเรียน'}).click();await page.waitForTimeout(200);const tabOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);if(tabOverflow>0)problems.push(`${name}: horizontal overflow ${tabOverflow}px`);await page.screenshot({path:`${out}/${name}.png`,fullPage:true});console.log('shot',name)}
}
await browser.close();
console.log(problems.length?'PROBLEMS\n'+problems.join('\n'):'no console errors, no horizontal overflow');
