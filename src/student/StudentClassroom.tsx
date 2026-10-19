import {ArrowRight, Check, ClipboardCheck, Lock, Play, Star, TrendingUp} from 'lucide-react';
import {quizLabels, quizKinds} from '../quiz-contract.ts';
import {DESK_SLOTS, ROOM} from './room-layout.ts';
import {buildDesks, buildRoom, currentDesk, currentRoomDeskId, missionToOpen, profileSummary, roomDeskCount, roomDeskState, roomWaitingOn, waitingOn, type ClassroomSnapshot, type Desk, type DeskState, type RoomDesk} from './classroom-model.ts';

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

// The room picture has 8 painted desks. The post-test always takes the podium (last slot); the pre-test and the topic desks
// fill the slots before it in order. A class has at most 5 topics (classroom_missions.topic check), so they always fit.
const PODIUM=DESK_SLOTS.length-1;
function placeDesks(room:readonly RoomDesk[]){
 const post=room.find(desk=>desk.kind==='quiz'&&desk.quiz==='post');
 return [...room.filter(desk=>desk!==post).slice(0,PODIUM).map((desk,slot)=>({desk,slot})),...(post?[{desk:post,slot:PODIUM}]:[])];
}

export function StudentClassroom({name,xp,snapshot,completedIds,onOpen}:StudentClassroomProps){
 const room=buildRoom(snapshot);
 const currentId=currentRoomDeskId(snapshot,completedIds);
 const current=currentDesk(snapshot,completedIds);
 const profile=profileSummary(snapshot,completedIds);
 const postDesk=buildDesks(snapshot).find(desk=>desk.kind==='quiz'&&desk.quiz==='post');
 const postWaits=postDesk&&snapshot&&!snapshot.attempted.post?waitingOn(postDesk,snapshot,completedIds):[];
 const postNote=!postWaits.length?'':`ต้องผ่าน ${[...new Set(postWaits.map(item=>item.kind==='mission'?item.topic:item.label))].join(' และ ')} ก่อนปลดล็อก Post-test`;
 const open=(desk:RoomDesk)=>onOpen(desk.kind==='quiz'?desk:missionToOpen(desk,snapshot,completedIds));
 const deskButton=(desk:RoomDesk,slot:number)=>{
  const state=roomDeskState(desk,snapshot,completedIds);
  const waits=state==='locked'?roomWaitingOn(desk,snapshot,completedIds):[];
  const count=desk.kind==='topic'?roomDeskCount(desk,completedIds):null;
  const title=desk.kind==='quiz'?`แบบทดสอบ${quizLabels[desk.quiz]}`:desk.label;
  const label=`${title}${count?` ${count.done}/${count.total} ภารกิจ`:''} · ${stateText[state]}${waits.length?` · ต้องผ่าน ${waits[0].label} ก่อน`:''}`;
  return <button key={desk.id} data-desk={desk.id} className={`student-desk is-${state}${desk.id===currentId?' is-current':''}`} style={{left:`${DESK_SLOTS[slot].x/ROOM.width*100}%`,top:`${DESK_SLOTS[slot].y/ROOM.height*100}%`}} disabled={state==='locked'} aria-label={label} title={label} onClick={()=>open(desk)}>
   <span className="student-desk-number" aria-hidden="true">{desk.kind==='quiz'?<ClipboardCheck size={14}/>:slot+1}</span>
   <strong>{desk.label}</strong>{count&&<small className="student-desk-count">{count.done}/{count.total}</small>}
   <span className="student-desk-status" aria-hidden="true">{deskIcon(state)}</span>
  </button>;
 };

 return <div className="student-classroom">
  <section className="student-room" aria-label="ห้องเรียน">
   <p className="student-room-hint">เลื่อนดูห้องเรียนไปทางซ้ายและขวา</p>
   <div className="student-room-canvas">
    <img className="student-room-image" src="/images/student/classroom-room.webp" alt=""/>
    {placeDesks(room).map(({desk,slot})=>deskButton(desk,slot))}
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
