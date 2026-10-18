import type {MissionExercise} from '../mission-contract.ts';
export type ClassGroup={id:string;name:string;subject:string;term:string;join_code?:string};
export type Student={id:string;class_id:string;student_code:string;name:string;pre_test:number|null;post_test:number|null;name_confirmed?:boolean};
export type Mission={id:string;class_id:string;title:string;topic:string;difficulty:'easy'|'medium'|'hard';description:string;due_date:string|null;exercise?:MissionExercise|null};
export type Result={id:string;class_id:string;student_id:string;mission_id:string;score:number;completed:boolean;minutes:number};
export const topics=['SELECT','WHERE','ORDER BY','GROUP BY','JOIN'];
export const difficulties={easy:'ง่าย',medium:'ปานกลาง',hard:'ยาก'};
export async function fetchAllPages<T>(fetchPage:(from:number,to:number)=>Promise<{data:T[]|null;error:unknown|null}>,pageSize=1000){
 const rows:T[]=[];
 for(let from=0;;from+=pageSize){
  const response=await fetchPage(from,from+pageSize-1);
  if(response.error)throw response.error;
  const page=response.data??[];
  rows.push(...page);
  if(page.length<pageSize)return rows;
 }
}
export function summarize(student:Student,missions:Mission[],results:Result[]){
 const rows=results.filter(r=>r.student_id===student.id&&missions.some(m=>m.id===r.mission_id));
 const completed=rows.filter(r=>r.completed).length;
 const average=rows.length?Math.round(rows.reduce((n,r)=>n+Number(r.score),0)/rows.length):null;
 return {completed,progress:missions.length?Math.round(completed/missions.length*100):0,average,hours:rows.reduce((n,r)=>n+r.minutes,0)/60,status:average===null?'ยังไม่มีผล':average>=80?'ดีเยี่ยม':average>=65?'ดี':average>=50?'ต้องพัฒนา':'ต้องการความช่วยเหลือ'};
}
export function csvCell(value:unknown){const text=String(value??'');return '"'+(/^[=+@\-\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')+'"'}
export function makeReport(students:Student[],missions:Mission[],results:Result[]){
 return '\uFEFF'+[['รหัสนักเรียน','ชื่อ-นามสกุล','ภารกิจสำเร็จ','ภารกิจทั้งหมด','ความคืบหน้า (%)','คะแนนเฉลี่ย','Pre-test','Post-test','เวลาเรียน (ชั่วโมง)','สถานะ'],...students.map(s=>{const x=summarize(s,missions,results);return [s.student_code,s.name,x.completed,missions.length,x.progress,x.average,s.pre_test,s.post_test,x.hours.toFixed(1),x.status]})].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
