import {normalizeClassCode,type StudentCodes} from './student-access.ts';
import {missionRevision,type StudentMission} from '../mission-contract.ts';
export const progressKey=(codes:StudentCodes)=>`sql-missions-completed:v1:${normalizeClassCode(codes.classCode)}:${codes.studentCode.trim().toLowerCase()}`;
export function readCompleted(storage:Pick<Storage,'getItem'>,codes:StudentCodes|null,missions:readonly StudentMission[]):string[]{
 if(!codes)return [];
 try{
  const stored:unknown=JSON.parse(storage.getItem(progressKey(codes))||'{}');
  if(!stored||typeof stored!=='object'||Array.isArray(stored))return [];
  return missions.filter(m=>(stored as Record<string,unknown>)[m.id]===missionRevision(m)).map(m=>m.id);
 }catch{return [];}
}
export function storeCompleted(storage:Pick<Storage,'setItem'>,codes:StudentCodes,ids:readonly string[],missions:readonly StudentMission[]):boolean{
 try{storage.setItem(progressKey(codes),JSON.stringify(Object.fromEntries(missions.filter(m=>ids.includes(m.id)).map(m=>[m.id,missionRevision(m)]))));return true;}catch{return false;}
}
