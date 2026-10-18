import {useState,useEffect} from 'react';
import {Database as DatabaseIcon, GraduationCap, Home, Lightbulb, LogOut} from 'lucide-react';
import type {Database} from 'sql.js';
import {loadMissionEngine} from '../mission-engine.ts';
import {createMissionDatabase,runMissionQuery,resultsMatch,type MissionResult} from '../mission-sql.ts';
import {Login} from '../Login';
import {StudentClassroom} from './StudentClassroom';
import {StudentQuizPage} from './StudentQuizPage';
import {SqlLab} from './SqlLab';
import {IDLE, type Outcome} from './lab-model.ts';
import {clearStoredCodes, readStoredCodes, storeCodes, type StudentClassroom as StudentRoom, type StudentCodes} from './student-access.ts';
import {loadStudentClassroom,setStudentName} from './student-session.ts';
import {StudentNameDialog} from './StudentNameDialog';
import {readCompleted,storeCompleted} from './student-progress.ts';
import {deskState,buildDesks} from './classroom-model.ts';
import './student.css';
export function StudentApp(){const [page,setPage]=useState<'home'|'practice'|'quiz'>('home'),[quizKind,setQuizKind]=useState<'pre'|'post'>('pre'),[active,setActive]=useState(''),[sql,setSql]=useState(''),[db,setDb]=useState<Database>(),[result,setResult]=useState<MissionResult[]>([]),[outcome,setOutcome]=useState<Outcome>(IDLE),[hint,setHint]=useState(false),[done,setDone]=useState<string[]>([]),[codes,setCodes]=useState<StudentCodes|null>(()=>readStoredCodes(localStorage)),[room,setRoom]=useState<StudentRoom|null>(null),[loadError,setLoadError]=useState('');
const missions=room?.snapshot.missions??[];
const mission=missions.find(m=>m.id===active);
useEffect(()=>{
 if(page!=='practice'||!mission)return;
 let live=true;let database:Database|undefined;setDb(undefined);
 loadMissionEngine().then(SQL=>{if(!live)return;database=createMissionDatabase(SQL,mission.exercise);setDb(database);}).catch(error=>{if(live)setOutcome({tone:'error',text:error instanceof Error?error.message:'โหลด SQL Engine ไม่สำเร็จ'});});
 return()=>{live=false;database?.close();};
},[page,mission]);
useEffect(()=>{if(!codes||page!=='home')return;let live=true;loadStudentClassroom(codes).then(found=>{if(!live)return;if(found){setRoom(found);setDone(readCompleted(localStorage,codes,found.snapshot.missions));setLoadError('')}else{clearStoredCodes(localStorage);setCodes(null);setRoom(null);setLoadError('รหัสห้องเรียนหรือรหัสนักเรียนใช้ไม่ได้แล้ว กรุณาเข้าสู่ระบบใหม่')}}).catch(error=>{if(live)setLoadError(error instanceof Error?error.message:'เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง')});return()=>{live=false}},[codes,page]);
const activeIndex=missions.findIndex(m=>m.id===active);
const nextMission=missions[activeIndex+1];
const nextDesk=buildDesks(room?.snapshot??null).find(d=>d.id===nextMission?.id);
const nextLessonOpen=Boolean(nextDesk)&&deskState(nextDesk!,room?.snapshot??null,done)==='open';
function open(id:string){const selected=missions.find(m=>m.id===id);if(!selected)return;setDb(undefined);setActive(id);setPage('practice');setHint(false);setOutcome(IDLE);setResult([]);setSql(selected.exercise.starterSql);}
function openQuiz(kind:'pre'|'post'){setQuizKind(kind);setPage('quiz');}
function run(){if(!db||!mission)return;try{
 const output=runMissionQuery(db,sql);setResult(output);
 const same=resultsMatch(output,runMissionQuery(db,mission.exercise.answerSql),mission.exercise.rowOrder);
 const firstTime=same&&!done.includes(active);
 setOutcome(same?{tone:'right',firstTime}:{tone:'wrong'});
 if(firstTime&&codes){const next=[...done,active];setDone(next);storeCompleted(localStorage,codes,next,missions);}
}catch(error){setResult([]);setOutcome({tone:'error',text:error instanceof Error?error.message:'เกิดข้อผิดพลาด'});}}
function clear(){setSql('');setResult([]);setOutcome(IDLE);}
function signOut(){clearStoredCodes(localStorage);setCodes(null);setDone([]);setRoom(null);setLoadError('');setPage('home')}
async function saveName(name:string){
 if(!codes||!room)return 'ไม่พบข้อมูลนักเรียน กรุณาเข้าสู่ระบบใหม่';
 try{
  const outcome=await setStudentName(codes,name);
  if(!outcome)return 'รหัสห้องเรียนหรือรหัสนักเรียนใช้ไม่ได้แล้ว กรุณาเข้าสู่ระบบใหม่';
  if(outcome.status==='invalid')return 'ชื่อไม่ถูกต้อง กรุณากรอก 1 ถึง 100 ตัวอักษร';
  setRoom({...room,name:outcome.name,needsName:false});
  return '';
 }catch{return 'บันทึกชื่อไม่สำเร็จ กรุณาลองอีกครั้ง'}
}
if(!room){if(codes&&!loadError)return <div className="auth-loading" role="status">กำลังเข้าห้องเรียน…</div>;return <Login notice={loadError} onStudent={(next,found)=>{storeCodes(localStorage,next);setLoadError('');setCodes(next);setDone(readCompleted(localStorage,next,found.snapshot.missions));setRoom(found);setPage('home')}}/>}
return <div className="app student-app"><aside className="student-sidebar"><a className="student-brand" href="#" onClick={e=>{e.preventDefault();setPage('home')}}><span className="student-brand-icon"><DatabaseIcon size={36}/><GraduationCap size={23}/></span><span>SQL<strong>Classroom</strong></span></a><nav aria-label="เมนูนักเรียน"><button className="selected" onClick={()=>setPage('home')} aria-current={page==='home'?'page':undefined}><Home size={22}/>ห้องเรียนของฉัน</button></nav><div className="student-sidebar-art"><img src="/images/teacher/brand-art.png" alt=""/><p>ฝึก SQL ให้เป็นทักษะจริง<br/>เริ่มจากคำสั่งเล็ก ๆ ทุกวัน</p></div><button className="student-logout" onClick={signOut}><LogOut size={16}/> ออกจากระบบ</button></aside><main className={'student-main'+(page==='home'?' is-classroom':'')}><header className="student-header"><div className="student-heading"><img className="student-school" src="/images/student/header-house.png" alt=""/><div><h1>{page==='practice'?'ห้องทดลอง':page==='quiz'?'แบบทดสอบ':'ห้องเรียน'} <span>SQL</span></h1><p>{page==='practice'?'ลงมือเขียนคำสั่ง แล้วค้นพบคำตอบด้วยตัวเอง':page==='quiz'?'ตอบคำถามเพื่อดูความเข้าใจของคุณ':'เลือกโต๊ะแล้วเริ่มภารกิจ เพื่อพัฒนาทักษะ SQL ของคุณ'} <span className="student-sparkle" aria-hidden="true">✦</span></p></div></div><div className="student-hero"><p className="student-bubble"><Lightbulb size={18} aria-hidden="true"/>ทีละบท ทีละภารกิจ<br/>สู่การเป็นนักใช้ข้อมูลตัวจริง</p><img className="student-hero-art" src="/images/student/header-girl.png" alt=""/></div></header>
{loadError&&<p role="alert">{loadError}</p>}{page==='home'&&<StudentClassroom name={room.name} xp={done.length*100} snapshot={room.snapshot} completedIds={done} onOpen={desk=>{if(desk.kind==='mission')open(desk.missionId);else openQuiz(desk.quiz)}}/>}
{page==='practice'&&mission&&<SqlLab key={mission.id} lesson={{id:mission.id,ordinal:activeIndex+1,title:mission.title,task:mission.description,desc:mission.topic,answer:mission.exercise.answerSql,hint:mission.exercise.hint||'ครูยังไม่ได้กำหนดคำใบ้',tables:mission.exercise.tables}} total={missions.length} solved={done.includes(active)} ready={!!db} sql={sql} onSql={setSql} outcome={outcome} result={result} hint={hint} onHint={()=>setHint(!hint)} onRun={run} onClear={clear} onNext={done.includes(active)&&nextLessonOpen?()=>open(nextMission.id):null} onBack={()=>setPage('home')}/>} 
{page==='quiz'&&codes&&<StudentQuizPage codes={codes} quiz={quizKind} onBack={()=>setPage('home')} onSubmitted={()=>{}}/>}

</main>{room.needsName&&codes&&<StudentNameDialog code={codes.studentCode} onSave={saveName} onSwitchStudent={signOut}/>}</div>}
