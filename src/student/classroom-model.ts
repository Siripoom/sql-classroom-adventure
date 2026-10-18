import type {Grade,QuizKind} from '../quiz-contract.ts';
import type {StudentMission} from '../mission-contract.ts';
export type Desk={id:string;kind:'quiz';quiz:QuizKind;label:string}|{id:string;kind:'mission';missionId:string;label:string};
export type DeskState='locked'|'open'|'done';
export type ClassroomSnapshot={missions:StudentMission[];unconfiguredMissionCount:number;questionCounts:Record<QuizKind,number>;attempted:Record<QuizKind,boolean>;scores:Record<QuizKind,Grade|null>};
export function buildDesks(snapshot:ClassroomSnapshot|null):Desk[]{
 if(!snapshot)return [];
 return [
  ...(snapshot.questionCounts.pre?[{id:'pre',kind:'quiz' as const,quiz:'pre' as const,label:'Pre-test'}]:[]),
  ...snapshot.missions.map(m=>({id:m.id,kind:'mission' as const,missionId:m.id,label:m.title})),
  ...(snapshot.questionCounts.post?[{id:'post',kind:'quiz' as const,quiz:'post' as const,label:'Post-test'}]:[])
 ];
}
export function isAvailable(desk:Desk,snapshot:ClassroomSnapshot|null){return buildDesks(snapshot).some(item=>item.id===desk.id);}
function isFinished(desk:Desk,snapshot:ClassroomSnapshot|null,completed:readonly string[]){return desk.kind==='quiz'?Boolean(snapshot?.attempted[desk.quiz]):completed.includes(desk.missionId);}
export function waitingOn(desk:Desk,snapshot:ClassroomSnapshot|null,completed:readonly string[]):Desk[]{
 const desks=buildDesks(snapshot),index=desks.findIndex(item=>item.id===desk.id);
 return desks.slice(0,Math.max(index,0)).filter(before=>!isFinished(before,snapshot,completed));
}
export function deskState(desk:Desk,snapshot:ClassroomSnapshot|null,completed:readonly string[]):DeskState{
 if(!isAvailable(desk,snapshot))return 'locked';
 if(isFinished(desk,snapshot,completed))return 'done';
 return waitingOn(desk,snapshot,completed).length?'locked':'open';
}
export const currentDesk=(snapshot:ClassroomSnapshot|null,completed:readonly string[])=>buildDesks(snapshot).find(desk=>deskState(desk,snapshot,completed)==='open');
export function profileSummary(snapshot:ClassroomSnapshot|null,completed:readonly string[]){
 const rows=(snapshot?.missions??[]).map(m=>({id:m.id,topic:m.topic,title:m.title,state:deskState({id:m.id,kind:'mission',missionId:m.id,label:m.title},snapshot,completed)}));
 const quizzes=snapshot?.scores??{pre:null,post:null};
 return {lessons:rows,passed:rows.filter(row=>row.state==='done').length,total:rows.length,quizzes,gain:quizzes.pre&&quizzes.post?Math.round((quizzes.post.score-quizzes.pre.score)*10)/10:null};
}
