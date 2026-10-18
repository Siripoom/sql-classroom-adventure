import {ArrowRight, CheckCircle2, Database as DatabaseIcon, RotateCcw, SearchCheck, TriangleAlert} from 'lucide-react';
import type {Piece, Verdict} from './lab-model.ts';

const MESSAGE={
 incomplete:['ยังเรียงไม่ครบ','แตะคำที่เหลือให้ครบทุกคำ แล้วกดตรวจลำดับอีกครั้ง'],
 wrong:['ลำดับยังไม่ถูก','ลองสลับคำใหม่ แตะคำที่วางแล้วเพื่อเอาออก หรือกดขอคำใบ้'],
 right:['เรียงถูกแล้ว!','ลำดับคำสั่งถูกต้อง ต่อไปลองพิมพ์คำสั่งนี้ด้วยตัวเอง'],
} as const;

export function ArrangeBoard({pool,placed,verdict,onPlace,onRemove,onCheck,onClear,onContinue}:{
 pool:readonly Piece[];placed:readonly number[];verdict:Verdict|null;
 onPlace:(id:number)=>void;onRemove:(id:number)=>void;onCheck:()=>void;onClear:()=>void;onContinue:()=>void;
}){
 const byId=new Map(pool.map(p=>[p.id,p]));
 const message=verdict?MESSAGE[verdict]:null;
 return <>
  <div className="lab-editor lab-arrange">
   <div className="lab-editor-bar"><span><DatabaseIcon size={20} aria-hidden="true"/>เรียงคำสั่ง</span><small>แตะคำเพื่อวางตามลำดับ</small></div>
   <div className="arrange-line" aria-label="คำสั่งที่เรียงแล้ว">
    {placed.length?placed.map(id=><button key={id} className="arrange-chip is-placed" onClick={()=>onRemove(id)} aria-label={`เอา ${byId.get(id)?.text} ออก`}>{byId.get(id)?.text}</button>)
     :<span className="arrange-placeholder">คำที่แตะจะมาอยู่ตรงนี้</span>}
   </div>
   <div className="arrange-pool" role="group" aria-label="คำที่ใช้เรียง">
    {pool.map(p=><button key={p.id} className="arrange-chip" disabled={placed.includes(p.id)} onClick={()=>onPlace(p.id)}>{p.text}</button>)}
   </div>
   <div className="lab-actions">
    <button className="lab-run" disabled={!placed.length||verdict==='right'} onClick={onCheck}><SearchCheck size={22} aria-hidden="true"/>ตรวจลำดับ</button>
    <button className="lab-clear" disabled={!placed.length} onClick={onClear}><RotateCcw size={18} aria-hidden="true"/>ล้าง</button>
   </div>
  </div>
  <div role="status" className={`lab-banner ${verdict==='right'?'is-right':verdict?'is-wrong':''}`}>
   {message&&<>{verdict==='right'?<CheckCircle2 size={44} aria-hidden="true"/>:<TriangleAlert size={36} aria-hidden="true"/>}
    <div><b>{message[0]}</b><span>{message[1]}</span></div>
    {verdict==='right'&&<button className="lab-next" onClick={onContinue}>ไปเขียนเอง<ArrowRight size={20} aria-hidden="true"/></button>}</>}
  </div>
 </>;
}
