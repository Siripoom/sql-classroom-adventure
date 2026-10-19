import type {Grade,QuizKind} from '../quiz-contract.ts';
import type {StudentMission} from '../mission-contract.ts';
export type QuizDesk={id:string;kind:'quiz';quiz:QuizKind;label:string};
export type MissionDesk={id:string;kind:'mission';missionId:string;label:string;topic:string};
export type Desk=QuizDesk|MissionDesk;
// The room shows one computer desk per topic. The missions of that topic are the items inside it, in the order students do them.
export type TopicDesk={id:string;kind:'topic';topic:string;label:string;missions:MissionDesk[]};
export type RoomDesk=QuizDesk|TopicDesk;
export type DeskState='locked'|'open'|'done';
export type ClassroomSnapshot={missions:StudentMission[];unconfiguredMissionCount:number;questionCounts:Record<QuizKind,number>;attempted:Record<QuizKind,boolean>;scores:Record<QuizKind,Grade|null>};
export function buildDesks(snapshot:ClassroomSnapshot|null):Desk[]{
 if(!snapshot)return [];
 return [
  ...(snapshot.questionCounts.pre?[{id:'pre',kind:'quiz' as const,quiz:'pre' as const,label:'Pre-test'}]:[]),
  ...snapshot.missions.map(m=>({id:m.id,kind:'mission' as const,missionId:m.id,label:m.title,topic:m.topic})),
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
export function buildRoom(snapshot:ClassroomSnapshot|null):RoomDesk[]{
 const room:RoomDesk[]=[];
 for(const desk of buildDesks(snapshot)){
  if(desk.kind==='quiz'){room.push(desk);continue;}
  const group=room.find((item):item is TopicDesk=>item.kind==='topic'&&item.topic===desk.topic);
  if(group)group.missions.push(desk);
  else room.push({id:`topic:${desk.topic}`,kind:'topic',topic:desk.topic,label:desk.topic,missions:[desk]});
 }
 return room;
}
export function roomDeskState(desk:RoomDesk,snapshot:ClassroomSnapshot|null,completed:readonly string[]):DeskState{
 if(desk.kind==='quiz')return deskState(desk,snapshot,completed);
 const states=desk.missions.map(mission=>deskState(mission,snapshot,completed));
 return states.every(state=>state==='done')?'done':states.includes('open')?'open':'locked';
}
export const roomDeskCount=(desk:TopicDesk,completed:readonly string[])=>({done:desk.missions.filter(m=>completed.includes(m.missionId)).length,total:desk.missions.length});
export const missionToOpen=(desk:TopicDesk,snapshot:ClassroomSnapshot|null,completed:readonly string[])=>desk.missions.find(m=>deskState(m,snapshot,completed)==='open')??desk.missions[0];
export const roomWaitingOn=(desk:RoomDesk,snapshot:ClassroomSnapshot|null,completed:readonly string[])=>waitingOn(desk.kind==='quiz'?desk:desk.missions[0],snapshot,completed);
export function currentRoomDeskId(snapshot:ClassroomSnapshot|null,completed:readonly string[]){
 const current=currentDesk(snapshot,completed);
 return current&&(current.kind==='quiz'?current.id:`topic:${current.topic}`);
}
export function profileSummary(snapshot:ClassroomSnapshot|null,completed:readonly string[]){
 const rows=(snapshot?.missions??[]).map(m=>({id:m.id,topic:m.topic,title:m.title,state:deskState({id:m.id,kind:'mission',missionId:m.id,label:m.title,topic:m.topic},snapshot,completed)}));
 const quizzes=snapshot?.scores??{pre:null,post:null};
 return {lessons:rows,passed:rows.filter(row=>row.state==='done').length,total:rows.length,quizzes,gain:quizzes.pre&&quizzes.post?Math.round((quizzes.post.score-quizzes.pre.score)*10)/10:null};
}
