import {ArrowRight, Check, ClipboardCheck, Lock, Play, Star, TrendingUp} from 'lucide-react';
import {quizLabels, quizKinds} from '../quiz-contract.ts';
import {DESK_SLOTS, ROOM} from './room-layout.ts';
import {currentDesk, deskState, buildDesks, isAvailable, profileSummary, waitingOn, type ClassroomSnapshot, type Desk, type DeskState} from './classroom-model.ts';

const stateText:Record<DeskState,string>={locked:'ยังไม่เปิด',open:'พร้อมเรียน',done:'ผ่านแล้ว'};

type StudentClassroomProps={
 name:string;
 xp:number;
 snapshot:ClassroomSnapshot|null;
 completedIds:readonly string[];
 onOpen:(desk:Desk)=>void;
};


function deskIcon(state:DeskState){
 return state==='done'?<Check size={20}/>:state==='locked'?<Lock size={18}/>:<Play size={20} fill="currentColor"/>;
}

// The room picture has 8 painted desks. The post-test always takes the podium (last slot); the pre-test and the missions
// fill the slots before it in order. Desks past the 7 earlier slots do not fit in the picture and are listed in the profile card.
const PODIUM=DESK_SLOTS.length-1;
function placeDesks(desks:readonly Desk[]){
 const post=desks.find(desk=>desk.kind==='quiz'&&desk.quiz==='post');
 const earlier=desks.filter(desk=>desk!==post);
 return {placed:[...earlier.slice(0,PODIUM).map((desk,slot)=>({desk,slot})),...(post?[{desk:post,slot:PODIUM}]:[])],overflow:earlier.slice(PODIUM)};
}

export function StudentClassroom({name,xp,snapshot,completedIds,onOpen}:StudentClassroomProps){
 const desks=buildDesks(snapshot);
 const current=currentDesk(snapshot,completedIds);
 const profile=profileSummary(snapshot,completedIds);
 const currentId=current?.id;
 const postDesk=desks.find(desk=>desk.kind==='quiz'&&desk.quiz==='post');
 const postWaits=postDesk&&snapshot&&!snapshot.attempted.post?waitingOn(postDesk,snapshot,completedIds):[];
 const postNote=!postWaits.length?'':`ต้องผ่าน ${postWaits.map(item=>item.label).join(' และ ')} ก่อนปลดล็อก Post-test`;
 const {placed,overflow}=placeDesks(desks);
 const deskButton=(desk:Desk,className:string,style?:React.CSSProperties,number?:number)=>{
  const state=deskState(desk,snapshot,completedIds);
  const waits=state==='locked'&&isAvailable(desk,snapshot)?waitingOn(desk,snapshot,completedIds):[];
  const title=desk.kind==='quiz'?`แบบทดสอบ${quizLabels[desk.quiz]}`:desk.label;
  const label=`${title} · ${stateText[state]}${waits.length?` · ต้องผ่าน ${waits[0].label} ก่อน`:''}`;
  return <button key={desk.id} data-desk={desk.id} className={`${className} is-${state}${desk.id===currentId?' is-current':''}`} style={style} disabled={state==='locked'} aria-label={label} title={label} onClick={()=>onOpen(desk)}>
   {number!==undefined&&<span className="student-desk-number" aria-hidden="true">{desk.kind==='quiz'?<ClipboardCheck size={14}/>:number}</span>}
   <strong>{desk.label}</strong>
   <span className="student-desk-status" aria-hidden="true">{deskIcon(state)}</span>
  </button>;
 };

 return <div className="student-classroom">
  <section className="student-room" aria-label="ห้องเรียน">
   <p className="student-room-hint">เลื่อนดูห้องเรียนไปทางซ้ายและขวา</p>
   <div className="student-room-canvas">
    <img className="student-room-image" src="/images/student/classroom-room.webp" alt=""/>
    {placed.map(({desk,slot})=>deskButton(desk,'student-desk',{left:`${DESK_SLOTS[slot].x/ROOM.width*100}%`,top:`${DESK_SLOTS[slot].y/ROOM.height*100}%`},slot+1))}
   </div>
  </section>
  <section className="student-profile-card" aria-label="โปรไฟล์ของฉัน">
   <div className="student-profile-top">
    <span className="student-avatar" aria-hidden="true">{name.slice(0,1)}</span>
    <div><h2>{name}</h2><p><Star size={15} fill="currentColor"/> {xp} XP ฝึกฝนในเครื่องนี้</p></div>
   </div>
   <section aria-labelledby="student-progress-title">
    <div className="student-profile-row"><h3 id="student-progress-title">ภารกิจที่ผ่านแล้ว</h3><b>{profile.passed}/{profile.total}</b></div>
    <progress value={profile.passed} max={profile.total||1} aria-labelledby="student-progress-title"/>
    {!snapshot?.missions.length&&<p role="status" className="student-notice">ยังไม่มีภารกิจ SQL ที่พร้อมทำในห้องนี้</p>}
    {Boolean(snapshot?.unconfiguredMissionCount)&&<p role="status" className="student-notice">ครูกำลังเตรียมข้อมูลอีก {snapshot!.unconfiguredMissionCount} ภารกิจ</p>}
   </section>
   {overflow.length>0&&<section aria-labelledby="student-more-title">
    <h3 id="student-more-title">ภารกิจเพิ่มเติม</h3>
    <div className="student-more-list">{overflow.map(desk=>deskButton(desk,'student-more'))}</div>
   </section>}
   <section aria-labelledby="student-quiz-title">
    <h3 id="student-quiz-title">คะแนนแบบทดสอบ</h3>
    <div className="student-quiz-scores">
     {quizKinds.map(kind=>{
      const grade=profile.quizzes[kind];
      return <div key={kind} className="student-quiz-score"><small>{quizLabels[kind]}</small><strong>{grade?`${grade.score}%`:'—'}</strong><span>{grade?`ถูก ${grade.correct}/${grade.total} ข้อ`:'ยังไม่มีคะแนน'}</span></div>;
     })}
    </div>
    {profile.gain!==null&&<p className="student-gain"><TrendingUp size={16}/> พัฒนาการ {profile.gain>0?'+':''}{profile.gain} คะแนน</p>}
    {postNote&&<p className="student-post-wait" role="status"><Lock size={15}/> {postNote}</p>}
   </section>
   <section className="student-lesson-list" aria-labelledby="student-lessons-title">
    <h3 id="student-lessons-title">ความคืบหน้ารายภารกิจ</h3>
    <ul>
     {profile.lessons.map(lesson=><li key={lesson.id} className={`is-${lesson.state}`}><span className="student-lesson-mark" aria-hidden="true">{lesson.state==='done'?<Check size={15}/>:lesson.state==='locked'?<Lock size={13}/>:'•'}</span><div><b>{lesson.topic}</b><small>{lesson.title}</small></div><em>{stateText[lesson.state]}</em></li>)}
    </ul>
   </section>
   <button className="student-start" disabled={!current} onClick={()=>current&&onOpen(current)}>
    <Play size={20} fill="currentColor"/>{current?`${current.kind==='quiz'?'ทำ':'เรียนต่อ'} ${current.label}`:'ยังไม่มีภารกิจที่เปิด'}<ArrowRight size={20}/>
   </button>
  </section>
 </div>;
}
