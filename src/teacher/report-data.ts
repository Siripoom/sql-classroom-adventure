import type {Mission,Result,Student} from './model';

export type ReportStatus='ดีเยี่ยม'|'ดี'|'ต้องพัฒนา'|'ต้องการความช่วยเหลือ'|'ยังไม่มีผล';
export type BadgeTone='mint'|'gold'|'rose'|'neutral';

export type StatusDefinition={status:ReportStatus;tone:BadgeTone};
export type PrePostStudent={student:Student;pre:number;post:number;gain:number};
export type PrePostSummary={
 pairCount:number;
 averagePre:number|null;
 averagePost:number|null;
 averageGain:number|null;
 improved:number;
 topImprovers:PrePostStudent[];
};
export type StatusDistributionItem={status:ReportStatus;tone:BadgeTone;count:number;percent:number};
export type FollowUpStudent={
 student:Student;
 status:ReportStatus;
 tone:BadgeTone;
 average:number|null;
 completed:number;
 progress:number;
 hours:number;
};
export type FollowUpSummary={items:FollowUpStudent[];total:number;omitted:number};
export type HardestMission={mission:Mission;completed:number;total:number;rate:number;tone:BadgeTone};

export const statusDefinitions:ReadonlyArray<StatusDefinition>=[
 {status:'ดีเยี่ยม',tone:'mint'},
 {status:'ดี',tone:'mint'},
 {status:'ต้องพัฒนา',tone:'gold'},
 {status:'ต้องการความช่วยเหลือ',tone:'rose'},
 {status:'ยังไม่มีผล',tone:'neutral'}
];

const statusTones:Record<ReportStatus,BadgeTone>=Object.fromEntries(
 statusDefinitions.map(({status,tone})=>[status,tone])
) as Record<ReportStatus,BadgeTone>;

function roundOne(value:number):number{
 return Math.round((value+Number.EPSILON)*10)/10;
}

function percent(part:number,total:number):number{
 return total>0?Math.round(part/total*100):0;
}

function reportStatus(value:string):ReportStatus{
 return Object.prototype.hasOwnProperty.call(statusTones,value)?value as ReportStatus:'ยังไม่มีผล';
}

type ReportStudentSummary={completed:number;progress:number;average:number|null;hours:number;status:ReportStatus};

function summarizeReportStudent(student:Student,missions:Mission[],results:Result[]):ReportStudentSummary{
 const rows=results.filter(result=>result.student_id===student.id&&missions.some(mission=>mission.id===result.mission_id));
 const completed=rows.filter(result=>result.completed).length;
 const average=rows.length?Math.round(rows.reduce((total,result)=>total+result.score,0)/rows.length):null;
 const status=average===null?'ยังไม่มีผล':average>=80?'ดีเยี่ยม':average>=65?'ดี':average>=50?'ต้องพัฒนา':'ต้องการความช่วยเหลือ';
 return {completed,progress:percent(completed,missions.length),average,hours:rows.reduce((total,result)=>total+result.minutes,0)/60,status};
}

export function prePostSummary(students:Student[]):PrePostSummary{
 const pairs:PrePostStudent[]=students
  .filter((student):student is Student&{pre_test:number;post_test:number}=>student.pre_test!==null&&student.post_test!==null)
  .map(student=>({student,pre:student.pre_test,post:student.post_test,gain:roundOne(student.post_test-student.pre_test)}));
 if(!pairs.length){
  return {pairCount:0,averagePre:null,averagePost:null,averageGain:null,improved:0,topImprovers:[]};
 }
 const preTotal=pairs.reduce((total,row)=>total+row.pre,0);
 const postTotal=pairs.reduce((total,row)=>total+row.post,0);
 const gainTotal=pairs.reduce((total,row)=>total+row.gain,0);
 return {
  pairCount:pairs.length,
  averagePre:roundOne(preTotal/pairs.length),
  averagePost:roundOne(postTotal/pairs.length),
  averageGain:roundOne(gainTotal/pairs.length),
  improved:pairs.filter(row=>row.gain>0).length,
  topImprovers:[...pairs].sort((a,b)=>b.gain-a.gain||a.student.name.localeCompare(b.student.name,'th')).slice(0,5)
 };
}

export function statusDistribution(students:Student[],missions:Mission[],results:Result[]):StatusDistributionItem[]{
 const counts:Record<ReportStatus,number>=Object.fromEntries(statusDefinitions.map(({status})=>[status,0])) as Record<ReportStatus,number>;
 students.forEach(student=>{
  const status=reportStatus(summarizeReportStudent(student,missions,results).status);
  counts[status]+=1;
 });
 return statusDefinitions.map(({status,tone})=>({status,tone,count:counts[status],percent:percent(counts[status],students.length)}));
}

export function followUpList(students:Student[],missions:Mission[],results:Result[]):FollowUpSummary{
 const candidates:FollowUpStudent[]=students
  .map(student=>{
   const summary=summarizeReportStudent(student,missions,results);
   const status=reportStatus(summary.status);
   return {
    student,status,tone:statusTones[status],average:summary.average,completed:summary.completed,
    progress:summary.progress,hours:roundOne(summary.hours)
   };
  })
  .filter(row=>row.status==='ต้องการความช่วยเหลือ'||row.status==='ยังไม่มีผล')
  .sort((a,b)=>(a.average??-1)-(b.average??-1)||a.student.name.localeCompare(b.student.name,'th'));
 const items=candidates.slice(0,8);
 return {items,total:candidates.length,omitted:Math.max(0,candidates.length-items.length)};
}

export function hardestMissions(missions:Mission[],students:Student[],results:Result[]):HardestMission[]{
 return missions.map(mission=>{
  const completed=results.filter(result=>result.mission_id===mission.id&&result.completed).length;
  const rate=percent(completed,students.length);
  const tone:BadgeTone=mission.difficulty==='hard'?'rose':mission.difficulty==='medium'?'gold':'mint';
  return {mission,completed,total:students.length,rate,tone};
 }).sort((a,b)=>a.rate-b.rate||a.completed-b.completed||a.mission.title.localeCompare(b.mission.title,'th')).slice(0,5);
}

export function difficultyLabel(difficulty:Mission['difficulty']):string{
 const labels:Record<Mission['difficulty'],string>={easy:'ง่าย',medium:'ปานกลาง',hard:'ยาก'};
 return labels[difficulty];
}
