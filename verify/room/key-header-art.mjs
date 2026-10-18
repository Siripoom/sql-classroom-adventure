// Usage: node verify/room/key-header-art.mjs <house-crop.png> <girl-crop.png>
// Turns the flat lavender backdrop of the cropped design art into transparency.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';

const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const outDir=new URL('../../public/images/student/',import.meta.url);
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage();
for(const [input,name] of [[process.argv[2],'header-house.png'],[process.argv[3],'header-girl.png']]){
 const data=readFileSync(input).toString('base64');
 await page.setContent(`<canvas id=c></canvas><img id=i src="data:image/png;base64,${data}">`);
 await page.waitForFunction(()=>document.getElementById('i').complete);
 const url=await page.evaluate(()=>{
  const img=document.getElementById('i'),c=document.getElementById('c');
  c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const d=ctx.getImageData(0,0,c.width,c.height),p=d.data;
  const ref=[p[0],p[1],p[2]];
  const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
  for(let i=0;i<p.length;i+=4){
   const dist=Math.hypot(p[i]-ref[0],p[i+1]-ref[1],p[i+2]-ref[2]);
   p[i+3]=Math.round(255*smooth((dist-8)/26));
  }
  ctx.putImageData(d,0,0);
  return c.toDataURL('image/png');
 });
 writeFileSync(new URL(name,outDir),Buffer.from(url.split(',')[1],'base64'));
 console.log('wrote',name);
}
await browser.close();
