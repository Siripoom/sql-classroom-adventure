import {parseStudentMission} from '../mission-contract.ts';
import type {Grade, QuizKind} from '../quiz-contract.ts';
import type {ClassroomSnapshot} from './classroom-model.ts';

export type StudentCodes={classCode:string;studentCode:string};
export type StudentClassroom={name:string;needsName:boolean;snapshot:ClassroomSnapshot};
export type NameOutcome={status:'confirmed'|'invalid';name:string};

export const normalizeClassCode=(value:string)=>value.trim().toUpperCase();
export const normalizeStudentCode=(value:string)=>value.trim();
export const MAX_NAME_LENGTH=100;
// Same rule as student_set_name(): collapse whitespace, 1..100 characters. The server stays the judge; this only saves a round trip.
export function cleanStudentName(value:string):string|null{
 const name=value.replace(/\s+/g,' ').trim();
 return name&&[...name].length<=MAX_NAME_LENGTH?name:null;
}

const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const count=(value:unknown):number=>{
 if(typeof value!=='number'||!Number.isInteger(value)||value<0)throw new Error('student_classroom: bad count');
 return value;
};

function grade(value:unknown):Grade|null{
 if(value===null)return null;
 if(!isRecord(value)||typeof value.score!=='number')throw new Error('student_classroom: bad score');
 return {correct:count(value.correct),total:count(value.total),score:value.score};
}

// student_classroom() answers null for any unknown code pair; anything else must have the documented shape.
export function parseStudentClassroom(raw:unknown):StudentClassroom|null{
 if(raw===null)return null;
 if(!isRecord(raw)||typeof raw.name!=='string'||typeof raw.needsName!=='boolean'||!isRecord(raw.questionCounts)||!isRecord(raw.scores)||!isRecord(raw.attempted))throw new Error('student_classroom: bad shape');
 if(!Array.isArray(raw.missions))throw new Error('ระบบภารกิจยังไม่อัปเดต ให้ผู้ดูแลรัน teacher-missions.sql และ student-access.sql');
 const missions=raw.missions.filter(item=>!isRecord(item)||item.exercise!==null).map(parseStudentMission);
 if(new Set(missions.map(m=>m.id)).size!==missions.length)throw new Error('รหัสภารกิจซ้ำกัน');
 const pick=<T,>(source:Record<string,unknown>,read:(value:unknown)=>T):Record<QuizKind,T>=>({pre:read(source.pre),post:read(source.post)});
 return {
  name:raw.name,
  needsName:raw.needsName,
  snapshot:{
   missions,
   unconfiguredMissionCount:raw.unconfiguredMissionCount===undefined?raw.missions.length-missions.length:count(raw.unconfiguredMissionCount),
   questionCounts:pick(raw.questionCounts,count),
   attempted:pick(raw.attempted,value=>{if(typeof value!=='boolean')throw new Error('student_classroom: bad attempt');return value}),
   scores:pick(raw.scores,grade)
  }
 };
}

const KEY='sql-student-codes';

// student_set_name() answers null for an unknown code pair, otherwise a status and the stored name.
export function parseNameOutcome(raw:unknown):NameOutcome|null{
 if(raw===null)return null;
 if(!isRecord(raw)||(raw.status!=='confirmed'&&raw.status!=='invalid')||typeof raw.name!=='string')throw new Error('student_set_name: bad shape');
 return {status:raw.status,name:raw.name};
}

export function readStoredCodes(storage:Pick<Storage,'getItem'>):StudentCodes|null{
 try{
  const stored:unknown=JSON.parse(storage.getItem(KEY)||'null');
  return isRecord(stored)&&typeof stored.classCode==='string'&&typeof stored.studentCode==='string'?{classCode:stored.classCode,studentCode:stored.studentCode}:null;
 }catch{return null}
}
export const storeCodes=(storage:Pick<Storage,'setItem'>,codes:StudentCodes)=>storage.setItem(KEY,JSON.stringify(codes));
export const clearStoredCodes=(storage:Pick<Storage,'removeItem'>)=>storage.removeItem(KEY);
