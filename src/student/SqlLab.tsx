import type {MissionTable} from '../mission-contract.ts';
import {useMemo, useState} from 'react';
import {ArrowRight, Bot, CheckCircle2, ChevronRight, Database as DatabaseIcon, FileText, Lightbulb, Play, RotateCcw, Star, Table2, Target, TriangleAlert} from 'lucide-react';
import {SqlEditor} from './SqlEditor';
import {ArrangeBoard} from './ArrangeBoard';
import {TopicNotes} from './TopicNotes';
import {arrangePieces, judgeArrangement, type Outcome, type Phase, type Verdict} from './lab-model.ts';

type Lesson={id:string;ordinal:number;tables:MissionTable[];title:string;desc:string;task:string;answer:string;hint:string};
export type LabResult={columns:string[];values:unknown[][]};

const BADGE={right:['ok','แสดงผลสำเร็จ'],wrong:['warn','ยังไม่ตรงโจทย์'],error:['bad','มีข้อผิดพลาด']} as const;

export function SqlLab({lesson,total,solved,ready,sql,onSql,outcome,result,hint,onHint,onRun,onClear,onNext,onBack}:{
 lesson:Lesson;total:number;solved:boolean;ready:boolean;sql:string;onSql:(sql:string)=>void;outcome:Outcome;result:LabResult[];
 hint:boolean;onHint:()=>void;onRun:()=>void;onClear:()=>void;onNext:(()=>void)|null;onBack:()=>void;
}){
 // Phase 1 puts the words in order; phase 2 is the free editor. Remounted per lesson (key), so each lesson starts at phase 1.
 const [phase,setPhase]=useState<Phase>('arrange');
 const [placed,setPlaced]=useState<number[]>([]);
 const [verdict,setVerdict]=useState<Verdict|null>(null);
 const [arranged,setArranged]=useState(false);
 const pool=useMemo(()=>arrangePieces(lesson.answer,lesson.ordinal),[lesson.answer,lesson.ordinal]);
 const edit=(next:number[])=>{setPlaced(next);setVerdict(null)};
 const check=()=>{const v=judgeArrangement(placed.map(id=>pool.find(p=>p.id===id)!.text),lesson.answer);setVerdict(v);if(v==='right')setArranged(true)};
 const rows=result.reduce((n,r)=>n+r.values.length,0);
 const badge=outcome.tone==='idle'?null:BADGE[outcome.tone];
 return <>
  <button className="back" onClick={onBack}>← กลับไปยังบทเรียน</button>
  <TopicNotes topic={lesson.desc}/>
  <div className="practice lab">
   <section className="panel lab-mission">
    <div className="lab-title"><span className="lab-target"><Target size={28} aria-hidden="true"/></span><div><span className="pill">ภารกิจ {lesson.ordinal} / {total}</span><h1>{lesson.title}</h1></div><span className="lab-xp"><Star size={18} fill="currentColor" aria-hidden="true"/>+100 XP</span></div>
    <h3 className="lab-head"><FileText size={20} aria-hidden="true"/>โจทย์</h3>
    <p className="lab-task">{lesson.task}</p>
    <h3 className="lab-head"><DatabaseIcon size={20} aria-hidden="true"/>โครงสร้างตาราง</h3>
    {lesson.tables.map(table=><div className="lab-schema" key={table.name}>
     <b>ตาราง: {table.name}</b>
     <table><thead><tr><th>ชื่อคอลัมน์</th><th>ชนิดข้อมูล</th></tr></thead><tbody>{table.columns.map(c=><tr key={c.name}><td>{c.name}</td><td>{c.type}</td></tr>)}</tbody></table>
     <div className="lab-sample-table"><b>ข้อมูลตัวอย่าง ({table.rows.length} แถว)</b><table><thead><tr>{table.columns.map(c=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j}>{value===null?'NULL':String(value)}</td>)}</tr>)}</tbody></table></div>
    </div>)}
    <div className="lab-hint">
     <span className="lab-bot"><Bot size={30} aria-hidden="true"/></span>
     <p>{hint?lesson.hint:'ติดตรงไหน กดขอคำใบ้ได้เลย'}</p>
     <button className="secondary" onClick={onHint} aria-expanded={hint}><Lightbulb size={18} aria-hidden="true"/>{hint?'ซ่อนคำใบ้':'คำใบ้'}<ChevronRight size={18} aria-hidden="true"/></button>
    </div>
    <small>ข้อมูลตามที่ครูกำหนด ระบบเริ่มฐานข้อมูลใหม่ทุกครั้งที่เปิดภารกิจ</small>
   </section>
   <section className="panel lab-work">
    <ol className="lab-steps" aria-label="ขั้นตอน">
     <li><button className={phase==='arrange'?'is-current':arranged?'is-done':''} aria-current={phase==='arrange'?'step':undefined} onClick={()=>setPhase('arrange')}><b>{arranged?<CheckCircle2 size={18} aria-hidden="true"/>:1}</b>เรียงคำสั่ง</button></li>
     <li><button className={phase==='write'?'is-current':''} aria-current={phase==='write'?'step':undefined} disabled={!arranged&&!solved} onClick={()=>setPhase('write')}><b>2</b>เขียนคำสั่ง</button></li>
    </ol>
    {phase==='arrange'?<ArrangeBoard pool={pool} placed={placed} verdict={verdict} onPlace={id=>edit([...placed,id])} onRemove={id=>edit(placed.filter(x=>x!==id))} onCheck={check} onClear={()=>edit([])} onContinue={()=>setPhase('write')}/>:<>
    <div className="lab-editor">
     <div className="lab-editor-bar"><span><DatabaseIcon size={20} aria-hidden="true"/>SQL</span><small>SQLite</small></div>
     <SqlEditor value={sql} onChange={onSql} onRun={onRun}/>
     <div className="lab-actions">
      <button className="lab-run" disabled={!ready} onClick={onRun}><Play size={20} fill="currentColor" aria-hidden="true"/>{ready?'รันคำสั่ง':'กำลังโหลด Engine...'}{ready&&<kbd>Ctrl + Enter</kbd>}</button>
      <button className="lab-clear" onClick={onClear}><RotateCcw size={18} aria-hidden="true"/>ล้าง</button>
     </div>
    </div>
    <div className="lab-result">
     <div className="lab-result-bar"><h3><Table2 size={22} aria-hidden="true"/>ผลลัพธ์{badge&&outcome.tone!=='error'&&<span> ({rows} แถว)</span>}</h3>{badge&&<span className={`lab-badge is-${badge[0]}`}>{badge[0]==='ok'&&<CheckCircle2 size={18} aria-hidden="true"/>}{badge[1]}</span>}</div>
     {result.length?result.map((r,i)=><div className="table-wrap" key={i}><table><thead><tr>{r.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{r.values.map((row,j)=><tr key={j}>{row.map((v,k)=><td key={k}>{v===null?'NULL':String(v)}</td>)}</tr>)}</tbody></table></div>)
      :<p className="lab-empty">{outcome.tone==='idle'?'กดรันคำสั่งเพื่อดูผลลัพธ์ที่นี่':outcome.tone==='error'?'ยังไม่มีผลลัพธ์':'คำสั่งนี้ไม่พบข้อมูล'}</p>}
    </div>
    <div role="status" className={`lab-banner is-${outcome.tone}`}>
     {outcome.tone==='right'&&<><CheckCircle2 size={44} aria-hidden="true"/><div><b>{outcome.firstTime?'สำเร็จ! คุณได้รับ 100 XP':'สำเร็จ! ภารกิจนี้ผ่านแล้ว'}</b><span>คำตอบของคุณถูกต้อง: {lesson.task}</span></div>{onNext&&<button className="lab-next" onClick={onNext}>ไปยังบทเรียนถัดไป<ArrowRight size={20} aria-hidden="true"/></button>}</>}
     {outcome.tone==='wrong'&&<><TriangleAlert size={36} aria-hidden="true"/><div><b>ยังไม่ตรงโจทย์</b><span>รันสำเร็จ แต่ผลลัพธ์ยังไม่ตรงโจทย์ ลองตรวจคอลัมน์และลำดับข้อมูลอีกครั้ง</span></div></>}
     {outcome.tone==='error'&&<><TriangleAlert size={36} aria-hidden="true"/><div><b>คำสั่งนี้ยังรันไม่ได้</b><span>{outcome.text}</span></div></>}
    </div>
    </>}
   </section>
  </div>
 </>;
}
