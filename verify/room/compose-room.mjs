// Usage: node verify/room/compose-room.mjs
// Builds public/images/student/classroom-room.webp (8 desks) from verify/room/source.png (6 desks):
// removes the painted path dots, repeats the middle desk row, keeps the side decor continuous,
// then widens the gap between desk columns and the side margins so the 8 desks spread over a wide room.
// Finally it lifts the 8 desks out of their two columns, repairs the floor under them, paints the dotted path,
// and sets each desk down again at its slot in src/student/room-layout.ts (scattered from left to right).
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';

import {DESK_SLOTS,pathCurves} from '../../src/student/room-layout.ts';

const require=createRequire(import.meta.url);
const {chromium}=require(`${homedir()}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const src=readFileSync(new URL('./source.png',import.meta.url)).toString('base64');
const target=new URL('../../public/images/student/classroom-room.webp',import.meta.url);

// Where the 8 desks stand in the two-column picture built below: left/right column x, four row centres.
const OLD=Array.from({length:8},(_,i)=>({x:[800,1642][i%2],y:[411,719,1023,1330][i>>1]}));
const layout={slots:DESK_SLOTS,curves:pathCurves(DESK_SLOTS),old:OLD};

const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage();
await page.setContent(`<canvas id=c></canvas><img id=i src="data:image/png;base64,${src}">`);
await page.waitForFunction(()=>document.getElementById('i').complete);
const url=await page.evaluate(layout=>{
 const img=document.getElementById('i'),c=document.getElementById('c');
 const W=img.naturalWidth,H=img.naturalHeight;
 c.width=W;c.height=H;
 const ctx=c.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,0);
 const d=ctx.getImageData(0,0,W,H),p=d.data;

 const mask=new Uint8Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(x>668&&x<1090&&y>960&&y<1180)continue;
  const i=(y*W+x)*4,r=p[i],g=p[i+1],b=p[i+2];
  if(b-g>45&&b>215&&r>=125&&r<205&&g>=105&&g<190)mask[y*W+x]=1;
 }
 const grown=new Uint8Array(W*H);
 for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++)if(mask[y*W+x])for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)grown[(y+dy)*W+x+dx]=1;
 const clean=new Uint8ClampedArray(p);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(!grown[y*W+x])continue;
  let sr=0,sg=0,sb=0,n=0;
  for(let R=6;R<=24&&n<8;R+=6)for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){
   const xx=x+dx,yy=y+dy;
   if(xx<0||yy<0||xx>=W||yy>=H||grown[yy*W+xx])continue;
   const j=(yy*W+xx)*4;sr+=p[j];sg+=p[j+1];sb+=p[j+2];n++;
  }
  if(n){const i=(y*W+x)*4;clean[i]=sr/n;clean[i+1]=sg/n;clean[i+2]=sb/n;}
 }

 const J=840,A=536,L=J-A,OH=H+L,FADE=10;
 const at=(x,y,k)=>{const yy=Math.min(H-1,Math.max(0,y)),y0=Math.floor(yy),y1=Math.min(H-1,y0+1),f=yy-y0;return clean[(y0*W+x)*4+k]*(1-f)+clean[(y1*W+x)*4+k]*f};
 const centerY=y=>y<J?y:y<J+L?A+(y-J):y-L;
 const SIDE_STRETCH_FROM=490,SIDE_TO=620;
 const sideEnd=SIDE_TO+L;
 const BAND=SIDE_TO-SIDE_STRETCH_FROM,LEGS=Math.round((sideEnd-SIDE_STRETCH_FROM)/BAND),LEG=(sideEnd-SIDE_STRETCH_FROM)/LEGS;
 // fill the extra height by bouncing through the featureless floor band (near 1:1), instead of stretching it
 const sideY=y=>{if(y<SIDE_STRETCH_FROM)return y;if(y>=sideEnd)return y-L;const t=(y-SIDE_STRETCH_FROM)/LEG,k=Math.floor(t),f=t-k;return SIDE_STRETCH_FROM+BAND*(k%2?1-f:f)};
 const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
 const out=ctx.createImageData(W,OH);
 for(let y=0;y<OH;y++)for(let x=0;x<W;x++){
  const side=Math.max(1-smooth((x-150)/50),smooth((x-1140)/50));
  for(let k=0;k<3;k++){
   let center=at(x,centerY(y),k);
   if(y>=J-FADE&&y<J){const t=(y-(J-FADE))/FADE;center=center*(1-t)+at(x,A+(y-J),k)*t}
   const edge=at(x,sideY(y),k);
   out.data[(y*W+x)*4+k]=center*(1-side)+edge*side;
  }
  out.data[(y*W+x)*4+3]=255;
 }
 c.height=OH;ctx.putImageData(out,0,0);
 // 8 desks spread over a wide room: widen the gap between the two desk columns and the outer margins
 // by bouncing through desk-free strips (near 1:1, no stretching). Must match LEFT/GAP in StudentClassroom.tsx.
 const LEFT=420,GAP=360,RIGHT=420;
 const tri=(d,len)=>{const k=Math.floor(d/len),f=d-k*len;return k%2?len-f:f};
 const GS=590,GE=650,WS=636,WE=656,WALL=215,LS=205,RS=1114;
 // the wall strip (y<WALL) is narrower so the chalk ledge eraser is not repeated
 const mapX=(x,y)=>{
  const gs=y<WALL?WS:GS,ge=y<WALL?WE:GE;
  if(x<LEFT)return Math.min(W-1,tri(LEFT-1-x+0.5,LS));
  if(x<LEFT+gs)return x-LEFT;
  if(x<LEFT+gs+GAP)return gs+tri(x-LEFT-gs+0.5,ge-gs);
  if(x<LEFT+GAP+W)return x-LEFT-GAP;
  return W-1-tri(x-(LEFT+GAP+W)+0.5,W-RS);
 };
 const TW=W+LEFT+GAP+RIGHT;
 const wide=document.createElement('canvas');
 wide.width=TW;wide.height=OH;
 const wctx=wide.getContext('2d');
 const wout=wctx.createImageData(TW,OH);
 for(let x=0;x<TW;x++){
  for(let y=0;y<OH;y++){
   const sx=Math.min(W-1,Math.max(0,Math.round(mapX(x,y))));
   const a=(y*W+sx)*4,b=(y*TW+x)*4;
   wout.data[b]=out.data[a];wout.data[b+1]=out.data[a+1];wout.data[b+2]=out.data[a+2];wout.data[b+3]=255;
  }
 }
 wctx.putImageData(wout,0,0);

 // ---- scatter the desks ----
 const base=wctx.getImageData(0,0,TW,OH);           // untouched two-column picture: source of the desk sprites
 const cur=wctx.getImageData(0,0,TW,OH);            // picture being edited
 const PODIUM=7;
 // sprite box around a desk centre (tight to the desk, plus a little floor that gets feathered away)
 const box=i=>i===PODIUM?{l:255,r:255,t:170,b:170}:i===6?{l:168,r:200,t:170,b:136}:i<2?{l:200,r:200,t:150,b:136}:{l:200,r:200,t:170,b:136};
 const FEATHER=26;
 const ramp=d=>d<=0?0:d>=FEATHER?1:d/FEATHER;
 const edge=(x,y,x0,y0,x1,y1)=>Math.min(x-x0,x1-x,y-y0,y1-y);
 const clamp=(v,m)=>Math.max(-m,Math.min(m,v));
 const px=(img,x,y)=>{const k=(Math.min(OH-1,Math.max(0,y))*TW+Math.min(TW-1,Math.max(0,x)))*4;return [img.data[k],img.data[k+1],img.data[k+2]]};
 // pieces of the surroundings that sit inside a desk's area and must not be touched or carried along
 const isCabinet=(x,y)=>x>=1760&&y<=337;
 const isShelf=(x,y)=>x>=1795&&y>=1425;
 // sprite pixels that belong to the surroundings; soft (0 inside, ramping to 1) so no hard hole is left
 const cutAlpha=(i,dx,dy)=>i===1?ramp(Math.max(122-dx,dy+74)):i===PODIUM?ramp(Math.max(140-dx,112-dy)):1;

 // Coons patch: a smooth colour correction over a rectangle that equals `ring` along its four edges.
 // ring(x,y) gives the wanted difference at a pixel just outside an edge, or null where it is not trustworthy.
 const coons=(x0,y0,x1,y1,ring)=>{
  const W=x1-x0,H=y1-y0;
  const profile=(n,get)=>{
   const a=new Float32Array(n*3),ok=new Uint8Array(n);
   for(let t=0;t<n;t++){const v=get(t);if(v){ok[t]=1;const lum=clamp((v[0]+v[1]+v[2])/3,30);for(let c=0;c<3;c++)a[t*3+c]=lum}}
   let any=false;for(let t=0;t<n;t++)if(ok[t])any=true;
   if(!any)return a;
   for(let t=0;t<n;t++){if(ok[t])continue;let u=-1;for(let d=1;d<n&&u<0;d++){if(t-d>=0&&ok[t-d])u=t-d;else if(t+d<n&&ok[t+d])u=t+d}for(let c=0;c<3;c++)a[t*3+c]=a[u*3+c]}
   const sm=new Float32Array(n*3);
   for(let t=0;t<n;t++)for(let c=0;c<3;c++){let sum=0,m=0;for(let d=-24;d<=24;d++){const q=t+d;if(q>=0&&q<n){sum+=a[q*3+c];m++}}sm[t*3+c]=sum/m}
   return sm;
  };
  const Lp=profile(H,t=>ring(x0-1,y0+t)),Rp=profile(H,t=>ring(x1,y0+t)),Tp=profile(W,t=>ring(x0+t,y0-1)),Bp=profile(W,t=>ring(x0+t,y1));
  const corner=(a,ai,b,bi,c)=>(a[ai*3+c]+b[bi*3+c])/2;
  return (x,y,c)=>{
   const u=(x-x0)/Math.max(1,W-1),v=(y-y0)/Math.max(1,H-1),xi=Math.min(W-1,Math.max(0,x-x0)),yi=Math.min(H-1,Math.max(0,y-y0));
   const c00=corner(Lp,0,Tp,0,c),c10=corner(Rp,0,Tp,W-1,c),c01=corner(Lp,H-1,Bp,0,c),c11=corner(Rp,H-1,Bp,W-1,c);
   return (1-u)*Lp[yi*3+c]+u*Rp[yi*3+c]+(1-v)*Tp[xi*3+c]+v*Bp[xi*3+c]-((1-u)*(1-v)*c00+u*(1-v)*c10+(1-u)*v*c01+u*v*c11);
  };
 };

 // free floor between the two columns, used to repair the floor under lifted desks
 const D0=1000,D1=1430;
 const refl=(v,len)=>{const m=((v%(2*len))+2*len)%(2*len);return m<len?m:2*len-m};
 const MARGIN=56,FE=56;                        // the repair fades out over FE px, inside a margin of MARGIN px around the desk
 const eramp=(d,f)=>d<=0?0:d>=f?1:d/f;
 layout.old.forEach((o,i)=>{
  // area to repair: the desk and its soft shadow
  const tight=i===PODIUM?{x0:o.x-240,x1:o.x+240,y0:o.y-165,y1:o.y+158}:{x0:o.x-(i===6?168:185),x1:o.x+185,y0:o.y-(i<2?155:165),y1:o.y+128};
  const LF=i===6?30:FE,x0=tight.x0-(i===6?LF:MARGIN),x1=tight.x1+MARGIN,y0=tight.y0-(i<2?0:MARGIN),y1=tight.y1+MARGIN;
  const fromLeft=o.x<1200;                       // mirror about the edge that touches open floor
  const axis=fromLeft?x1:x0;
  const donor=x=>Math.round(D0+refl(2*axis-x-D0,D1-D0));
  const skip=(x,y)=>(i===1&&isCabinet(x,y))||(i===PODIUM&&isShelf(x,y));
  const corr=coons(x0,y0,x1,y1,(x,y)=>{
   if(x<0||y<0||x>=TW||y>=OH||skip(x,y)||(i<2&&y<=y0-1))return null;
   const real=px(base,x,y),got=px(base,donor(x),y),d=real.map((v,c)=>v-got[c]);
   return Math.max(...d.map(Math.abs))>70?null:d;
  });
  for(let y=Math.max(0,y0);y<Math.min(OH,y1);y++)for(let x=Math.max(0,x0);x<Math.min(TW,x1);x++){
   if(skip(x,y))continue;
   const a=Math.min(eramp(x-x0,LF),eramp(x1-x,FE),eramp(y1-y,FE),i<2?1:eramp(y-y0,FE));
   const k=(y*TW+x)*4,s=(y*TW+donor(x))*4;
   for(let c=0;c<3;c++)cur.data[k+c]=(base.data[s+c]+corr(x,y,c))*a+cur.data[k+c]*(1-a);
  }
 });
 wctx.putImageData(cur,0,0);

 // dotted path, painted on the floor so desks stand on top of it
 wctx.save();
 wctx.strokeStyle='#a99bf2';wctx.lineWidth=9;wctx.lineCap='round';wctx.setLineDash([0,19]);wctx.globalAlpha=0.9;
 for(const k of layout.curves){wctx.beginPath();wctx.moveTo(k.from.x,k.from.y);wctx.bezierCurveTo(k.c1.x,k.c1.y,k.c2.x,k.c2.y,k.to.x,k.to.y);wctx.stroke()}
 wctx.restore();
 const painted=wctx.getImageData(0,0,TW,OH);

 // set each desk down at its slot, upper desks first so lower ones overlap them. Near the box edge the sprite's
 // colours are nudged toward the floor it lands on, so no rectangle shows.
 layout.slots.map((sl,i)=>({sl,i})).sort((a,b)=>a.sl.y-b.sl.y).forEach(({sl,i})=>{
  const o=layout.old[i],b=box(i),x0=sl.x-b.l,y0=sl.y-b.t,x1=sl.x+b.r,y1=sl.y+b.b;
  const sprite=(tx,ty)=>px(base,o.x+Math.min(b.r-1,Math.max(-b.l,tx-sl.x)),o.y+Math.min(b.b-1,Math.max(-b.t,ty-sl.y)));
  const fit=coons(x0,y0,x1,y1,(tx,ty)=>{
   if(tx<0||ty<0||tx>=TW||ty>=OH)return null;
   const under=px(painted,tx,ty),sp=sprite(tx,ty),d=under.map((v,c)=>v-sp[c]);
   return Math.max(...d.map(Math.abs))>70?null:d;
  });
  const REACH=48;
  for(let dy=-b.t;dy<b.b;dy++)for(let dx=-b.l;dx<b.r;dx++){
   const tx=sl.x+dx,ty=sl.y+dy;
   if(tx<0||ty<0||tx>=TW||ty>=OH)continue;
   const e=edge(dx,dy,-b.l,-b.t,b.r,b.b),a=ramp(e)*cutAlpha(i,dx,dy);
   if(a===0)continue;
   const w=Math.max(0,1-e/REACH),k=(ty*TW+tx)*4,f=((o.y+dy)*TW+(o.x+dx))*4;
   for(let c=0;c<3;c++)painted.data[k+c]=(base.data[f+c]+fit(tx,ty,c)*w)*a+painted.data[k+c]*(1-a);
  }
 });
 wctx.putImageData(painted,0,0);
 return wide.toDataURL('image/webp',0.92);
},layout);
writeFileSync(target,Buffer.from(url.split(',')[1],'base64'));
await browser.close();
console.log('wrote',target.pathname);
