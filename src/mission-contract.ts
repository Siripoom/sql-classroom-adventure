export type SqlValue=string|number|null;
export type MissionColumn={name:string;type:'INTEGER'|'REAL'|'TEXT'};
export type MissionTable={name:string;columns:MissionColumn[];rows:SqlValue[][]};
export type MissionExercise={version:1;tables:MissionTable[];answerSql:string;starterSql:string;hint:string;rowOrder:'any'|'exact'};
export type StudentMission={id:string;title:string;topic:string;difficulty:'easy'|'medium'|'hard';description:string;due_date:string|null;exercise:MissionExercise};
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
function text(v:unknown,label:string,max=10000):string{
 if(typeof v!=='string'||v.length>max)throw Error(`${label} ต้องเป็นข้อความไม่เกิน ${max} ตัวอักษร`);
 return v;
}
function identifier(v:unknown):string{
 const name=text(v,'ชื่อตารางหรือคอลัมน์',64);
 if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)||/^sqlite_/i.test(name))throw Error('ชื่อตารางและคอลัมน์ใช้ A-Z, a-z, ตัวเลข และ _ โดยไม่ขึ้นต้นด้วยตัวเลขหรือ sqlite_');
 return name;
}
function unique(names:string[]){if(new Set(names.map(n=>n.toLowerCase())).size!==names.length)throw Error('ชื่อตารางหรือคอลัมน์ซ้ำกัน');}
export function parseMissionExercise(raw:unknown):MissionExercise{
 if(!record(raw)||raw.version!==1||!Array.isArray(raw.tables)||raw.tables.length<1||raw.tables.length>8)throw Error('กำหนดตารางตัวอย่าง 1 ถึง 8 ตาราง');
 let cells=0;
 const tables=raw.tables.map((value):MissionTable=>{
  if(!record(value)||!Array.isArray(value.columns)||value.columns.length<1||value.columns.length>20||!Array.isArray(value.rows)||value.rows.length>200)throw Error('แต่ละตารางมี 1 ถึง 20 คอลัมน์ และไม่เกิน 200 แถว');
  const name=identifier(value.name);
  const columns=value.columns.map((column):MissionColumn=>{
   if(!record(column)||(column.type!=='INTEGER'&&column.type!=='REAL'&&column.type!=='TEXT'))throw Error('ชนิดข้อมูลต้องเป็น INTEGER, REAL หรือ TEXT');
   return {name:identifier(column.name),type:column.type};
  });
  unique(columns.map(c=>c.name));
  const rows=value.rows.map((row):SqlValue[]=>{
   if(!Array.isArray(row)||row.length!==columns.length)throw Error(`จำนวนค่าในแถวของ ${name} ต้องเท่ากับจำนวนคอลัมน์`);
   return row.map((v,i)=>{
    cells++;
    if(v===null)return null;
    if(columns[i].type==='TEXT'&&typeof v==='string'&&v.length<=2000)return v;
    if(columns[i].type!=='TEXT'&&typeof v==='number'&&Number.isFinite(v)&&(columns[i].type!=='INTEGER'||Number.isSafeInteger(v)))return v;
    throw Error(`ข้อมูล ${name}.${columns[i].name} ไม่ตรงกับชนิด ${columns[i].type}`);
   });
  });
  return {name,columns,rows};
 });
 if(cells>8000)throw Error('ข้อมูลตัวอย่างต้องไม่เกิน 8000 ช่อง');
 unique(tables.map(t=>t.name));
 if(raw.rowOrder!=='any'&&raw.rowOrder!=='exact')throw Error('เลือกรูปแบบการตรวจลำดับแถว');
 const answerSql=text(raw.answerSql,'คำตอบ SQL');
 if(!answerSql.trim())throw Error('กรุณากรอกคำตอบ SQL');
 return {version:1,tables,answerSql,starterSql:text(raw.starterSql,'คำสั่งเริ่มต้น'),hint:text(raw.hint,'คำใบ้'),rowOrder:raw.rowOrder};
}
export function parseStudentMission(raw:unknown):StudentMission{
 if(!record(raw)||typeof raw.id!=='string'||!raw.id||!['easy','medium','hard'].includes(String(raw.difficulty)))throw Error('ข้อมูลภารกิจไม่ถูกต้อง');
 if(raw.due_date!==null&&typeof raw.due_date!=='string')throw Error('กำหนดส่งไม่ถูกต้อง');
 return {id:raw.id,title:text(raw.title,'ชื่อภารกิจ',150),topic:text(raw.topic,'หัวข้อ',80),difficulty:raw.difficulty as StudentMission['difficulty'],description:text(raw.description,'โจทย์'),due_date:raw.due_date,exercise:parseMissionExercise(raw.exercise)};
}
export function missionRevision(mission:StudentMission){
 const content=JSON.stringify([mission.title,mission.description,mission.exercise]);
 let hash=2166136261,second=5381;
 for(let i=0;i<content.length;i++){hash=Math.imul(hash^content.charCodeAt(i),16777619);second=Math.imul(second,33)^content.charCodeAt(i);}
 return `${content.length}-${hash>>>0}-${second>>>0}`;
}
export const EXAMPLE_EXERCISE:MissionExercise={version:1,tables:[{name:'products',columns:[{name:'id',type:'INTEGER'},{name:'name',type:'TEXT'},{name:'price',type:'REAL'}],rows:[[1,'สมุด',25],[2,'ปากกา',10],[3,'กระเป๋า',250]]}],answerSql:'SELECT name, price FROM products WHERE price >= 25;',starterSql:'SELECT name, price FROM products\nWHERE ',hint:'ใช้ WHERE price >= 25 เพื่อเลือกสินค้าราคาอย่างน้อย 25 บาท',rowOrder:'any'};
