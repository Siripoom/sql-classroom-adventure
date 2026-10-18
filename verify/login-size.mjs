// Usage: node verify/login-size.mjs [outDir]  (needs: npx vite --config verify/vite.config.ts)
// Measures the login card and its fields for both roles; prints rows that differ.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
const {chromium}=createRequire(import.meta.url)(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const out=process.argv[2];if(out)mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const problems=[];
for(const [w,h] of [[1920,1080],[1366,768],[1024,768],[390,844]]){
 const page=await browser.newPage({viewport:{width:w,height:h}});
 await page.goto('http://localhost:5199/student.html');
 await page.waitForSelector('.classroom-login-card');
 const measure=()=>page.evaluate(()=>{
  const r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return [Math.round(b.width*10)/10,Math.round(b.height*10)/10]};
  const f=[...document.querySelectorAll('.login-name-field')].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.width*10)/10,Math.round(b.height*10)/10]});
  return {card:r('.classroom-login-card'),fields:f,submit:r('.login-submit'),roles:r('.login-role-switch')};
 });
 const res={};
 for(const role of ['นักเรียน','ครูผู้สอน']){
  await page.getByRole('button',{name:new RegExp(role)}).click();
  await page.waitForTimeout(200);
  res[role]=await measure();
  if(out)await page.screenshot({path:`${out}/login-${role==='นักเรียน'?'student':'teacher'}-${w}.png`});
 }
 const a=res['นักเรียน'],b=res['ครูผู้สอน'];
 const same=JSON.stringify(a)===JSON.stringify(b);
 console.log(w,same?'same':'DIFF',JSON.stringify(a),same?'':JSON.stringify(b));
 if(!same)problems.push(w);
 await page.close();
}
await browser.close();
console.log(problems.length?'problems at '+problems:'ok');
