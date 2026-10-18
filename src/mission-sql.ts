import type {Database,SqlJsStatic} from 'sql.js';
import {parseMissionExercise,type MissionExercise} from './mission-contract.ts';
export type MissionResult={columns:string[];values:unknown[][]};
function checkSelect(sql:string){
 if(sql.length>10000)throw Error('คำสั่ง SQL ต้องไม่เกิน 10000 ตัวอักษร');
 let plain='';
 for(let i=0;i<sql.length;){
  const c=sql[i],next=sql[i+1];
  if(c==='-'&&next==='-'){while(i<sql.length&&sql[i]!=='\n')i++;plain+=' ';continue;}
  if(c==='/'&&next==='*'){const end=sql.indexOf('*/',i+2);if(end<0)throw Error('ปิดความคิดเห็น SQL ด้วย */');i=end+2;plain+=' ';continue;}
  if(c==="'"||c==='"'||c==='`'||c==='['){
   const close=c==='['?']':c;let closed=false;i++;
   while(i<sql.length){if(sql[i]===close){if(sql[i+1]===close&&c!=='['){i+=2;continue;}i++;closed=true;break;}i++;}
   if(!closed)throw Error('ปิดเครื่องหมายคำพูดใน SQL');
   plain+=' value ';continue;
  }
  plain+=c;i++;
 }
 if(!/^\s*SELECT\b/i.test(plain)||plain.trim().replace(/;$/,'').includes(';'))throw Error('รองรับ SELECT หนึ่งคำสั่งต่อครั้งเท่านั้น');
}
export function runMissionQuery(db:Database,sql:string):MissionResult[]{
 checkSelect(sql);
 let result:MissionResult|undefined;
 let count=0;
 for(const statement of db.iterateStatements(sql)){
  try{
   if(++count>1)throw Error('รองรับ SELECT หนึ่งคำสั่งต่อครั้งเท่านั้น');
   const columns=statement.getColumnNames();
   if(!columns.length)throw Error('คำสั่งต้องส่งคืนคอลัมน์');
   const values:unknown[][]=[];
   while(statement.step()){
    if(values.length>=5000)throw Error('ผลลัพธ์เกิน 5000 แถว กรุณาจำกัดข้อมูล');
    values.push(statement.get());
   }
   result={columns,values};
  }finally{statement.free();}
 }
 if(!result)throw Error('กรุณากรอก SELECT');
 return [result];
}
export function createMissionDatabase(SQL:SqlJsStatic,exercise:MissionExercise):Database{
 const parsed=parseMissionExercise(exercise),db=new SQL.Database();
 try{
  for(const table of parsed.tables){
   db.run(`CREATE TABLE "${table.name}" (${table.columns.map(c=>`"${c.name}" ${c.type}`).join(',')})`);
   const statement=db.prepare(`INSERT INTO "${table.name}" VALUES (${table.columns.map(()=>'?').join(',')})`);
   try{for(const row of table.rows)statement.run(row);}finally{statement.free();}
  }
  db.run('PRAGMA query_only = ON');
  return db;
 }catch(error){db.close();throw error;}
}
export function validateMissionExercise(SQL:SqlJsStatic,exercise:MissionExercise):MissionResult[]{
 const db=createMissionDatabase(SQL,exercise);
 try{return runMissionQuery(db,exercise.answerSql);}finally{db.close();}
}
export function resultsMatch(actual:MissionResult[],expected:MissionResult[],order:MissionExercise['rowOrder']):boolean{
 const normalize=(results:MissionResult[])=>results.map(result=>({columns:result.columns,rows:order==='exact'?result.values.map(row=>JSON.stringify(row)):result.values.map(row=>JSON.stringify(row)).sort()}));
 return JSON.stringify(normalize(actual))===JSON.stringify(normalize(expected));
}
