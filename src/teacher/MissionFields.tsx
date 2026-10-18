import {useRef,useState} from 'react';
import {EXAMPLE_EXERCISE,parseMissionExercise,type MissionExercise,type MissionTable} from '../mission-contract.ts';
import {loadMissionEngine} from '../mission-engine.ts';
import {validateMissionExercise,type MissionResult} from '../mission-sql.ts';
import {topics,difficulties,type Mission} from './model.ts';

export function readMissionForm(data:FormData){
 const text=(key:string)=>String(data.get(key)??'').trim();
 if(!text('title')||!text('description'))throw Error('กรุณากรอกชื่อภารกิจและโจทย์สำหรับนักเรียน');
 const exercise=parseMissionExercise(JSON.parse(text('exercise')));
 return {title:text('title'),description:text('description'),topic:text('topic'),difficulty:text('difficulty'),due_date:text('due_date')||null,exercise};
}
export async function validateMissionForm(data:FormData){
 const draft=readMissionForm(data);
 validateMissionExercise(await loadMissionEngine(),draft.exercise);
 return draft;
}
export function MissionTables({tables}:{tables:MissionTable[]}){
 return <>{tables.map(table=><div className="mission-table-preview" key={table.name}><h4>{table.name}</h4><div className="td-table-wrap"><table><thead><tr>{table.columns.map(column=><th key={column.name}>{column.name}<small>{column.type}</small></th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell===null?<em>NULL</em>:String(cell)}</td>)}</tr>)}</tbody></table></div>{!table.rows.length&&<p>ตารางว่าง มีเฉพาะโครงสร้าง</p>}</div>)}</>;
}
export function MissionFields({record}:{record?:Mission}){
 const [exercise,setExercise]=useState<MissionExercise>(()=>record?.exercise??{version:1,tables:[],answerSql:'',starterSql:'',hint:'',rowOrder:'any'});
 const revision=useRef(0);
 const [preview,setPreview]=useState<MissionResult[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 function change(next:MissionExercise){revision.current++;setExercise(next);setPreview(null);setError('');}
 function tableChange(index:number,next:MissionTable){change({...exercise,tables:exercise.tables.map((table,i)=>i===index?next:table)});}
 async function inspect(){const version=revision.current;setBusy(true);setError('');setPreview(null);try{const result=validateMissionExercise(await loadMissionEngine(),parseMissionExercise(exercise));if(version===revision.current)setPreview(result);}catch(e){if(version===revision.current)setError(e instanceof Error?e.message:'ตรวจสอบไม่สำเร็จ');}finally{setBusy(false);}}
 return <div className="mission-fields">
  <label>ชื่อภารกิจ<input name="title" required maxLength={150} defaultValue={record?.title}/></label>
  <div className="td-form-grid"><label>หัวข้อ SQL<select name="topic" defaultValue={record?.topic??'SELECT'}>{topics.map(topic=><option key={topic}>{topic}</option>)}</select></label><label>ระดับความยาก<select name="difficulty" defaultValue={record?.difficulty??'easy'}>{Object.entries(difficulties).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
  <label>โจทย์สำหรับนักเรียน<textarea name="description" required maxLength={10000} rows={3} defaultValue={record?.description} placeholder="เช่น แสดงชื่อและราคาสินค้าที่ราคาอย่างน้อย 25 บาท"/></label>
  {record&&!record.exercise&&<p role="status">ภารกิจเดิมยังไม่มีข้อมูลฝึก นักเรียนจะเห็นเมื่อครูกำหนดตารางและคำตอบแล้ว</p>}
  <h3>ข้อมูลตัวอย่างที่นักเรียนใช้จริง</h3><p className="td-form-help">สร้างตารางและกรอกข้อมูลด้านล่าง ชื่อใช้ตัวอักษรอังกฤษ ตัวเลข และ _ ตัวอย่างนี้ฝึกอ่านข้อมูลด้วย SELECT เท่านั้น</p>
  <button type="button" className="td-soft" onClick={()=>change(structuredClone(EXAMPLE_EXERCISE))}>โหลดตัวอย่างตารางสินค้า</button>
  {exercise.tables.map((table,index)=><section className="mission-table-editor" key={index}>
   <div className="td-form-grid"><label>ชื่อตาราง {index+1}<input aria-label={`ชื่อตาราง ${index+1}`} value={table.name} onChange={e=>tableChange(index,{...table,name:e.target.value})}/></label><button type="button" className="td-soft" onClick={()=>change({...exercise,tables:exercise.tables.filter((_,i)=>i!==index)})}>ลบตาราง</button></div>
   {table.columns.map((column,col)=><div className="mission-column-editor" key={col}><label>ชื่อคอลัมน์ {col+1}<input value={column.name} onChange={e=>tableChange(index,{...table,columns:table.columns.map((c,i)=>i===col?{...c,name:e.target.value}:c)})}/></label><label>ชนิดข้อมูล<select value={column.type} onChange={e=>tableChange(index,{...table,columns:table.columns.map((c,i)=>i===col?{...c,type:e.target.value as typeof c.type}:c),rows:table.rows.map(row=>row.map((cell,i)=>i===col&&cell!==null?e.target.value==='TEXT'?String(cell):String(cell).trim()!==''&&Number.isFinite(Number(cell))?Number(cell):cell:cell))})}><option>INTEGER</option><option>REAL</option><option>TEXT</option></select></label><button type="button" className="td-soft" aria-label={`ลบคอลัมน์ ${column.name}`} onClick={()=>tableChange(index,{...table,columns:table.columns.filter((_,i)=>i!==col),rows:table.rows.map(row=>row.filter((_,i)=>i!==col))})}>ลบ</button></div>)}
   <button type="button" className="td-soft" disabled={table.columns.length>=20} onClick={()=>tableChange(index,{...table,columns:[...table.columns,{name:`column_${table.columns.length+1}`,type:'TEXT'}],rows:table.rows.map(row=>[...row,null])})}>เพิ่มคอลัมน์</button>
   <h4>แถวข้อมูล</h4><div className="td-table-wrap"><table><thead><tr>{table.columns.map((column,i)=><th key={i}>{column.name}</th>)}<th>จัดการ</th></tr></thead><tbody>{table.rows.map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}><input aria-label={`${table.name} แถว ${r+1} ${table.columns[c].name}`} disabled={cell===null} value={cell??''} onChange={e=>{const value=e.target.value;tableChange(index,{...table,rows:table.rows.map((row,i)=>i===r?row.map((cell,j)=>j===c?table.columns[c].type==='TEXT'?value:value.trim()!==''&&Number.isFinite(Number(value))?Number(value):value:cell):row)});}}/><label className="td-checkbox"><input type="checkbox" checked={cell===null} onChange={e=>tableChange(index,{...table,rows:table.rows.map((row,i)=>i===r?row.map((cell,j)=>j===c?e.target.checked?null:table.columns[c].type==='TEXT'?'':0:cell):row)})}/>NULL</label></td>)}<td><button type="button" className="td-soft" aria-label={`ลบแถว ${r+1} ของ ${table.name}`} onClick={()=>tableChange(index,{...table,rows:table.rows.filter((_,i)=>i!==r)})}>ลบ</button></td></tr>)}</tbody></table></div>
   <button type="button" className="td-soft" disabled={table.rows.length>=200||!table.columns.length} onClick={()=>tableChange(index,{...table,rows:[...table.rows,table.columns.map(c=>c.type==='TEXT'?'':0)]})}>เพิ่มแถว</button>
  </section>)}
  <button type="button" className="td-soft" disabled={exercise.tables.length>=8} onClick={()=>change({...exercise,tables:[...exercise.tables,{name:`table_${exercise.tables.length+1}`,columns:[{name:'id',type:'INTEGER'}],rows:[]}]})}>เพิ่มตาราง</button>
  <label>คำตอบ SQL<textarea aria-label="คำตอบ SQL" rows={4} value={exercise.answerSql} onChange={e=>change({...exercise,answerSql:e.target.value})}/></label>
  <p className="td-form-help">ตัวอย่าง SELECT name, price FROM products WHERE price &gt;= 25; ระบบตรวจชื่อคอลัมน์และค่าผลลัพธ์ ไม่บังคับให้เขียนเหมือนเฉลยทุกตัวอักษร เฉลยนี้ใช้ในขั้นเรียงคำสั่งของนักเรียนด้วย</p>
  <label>คำสั่งเริ่มต้นสำหรับนักเรียน<textarea rows={3} value={exercise.starterSql} onChange={e=>change({...exercise,starterSql:e.target.value})}/></label>
  <label>คำใบ้<textarea rows={2} value={exercise.hint} onChange={e=>change({...exercise,hint:e.target.value})}/></label>
  <label className="td-checkbox"><input type="checkbox" checked={exercise.rowOrder==='exact'} onChange={e=>change({...exercise,rowOrder:e.target.checked?'exact':'any'})}/>ตรวจลำดับแถวด้วย เช่น โจทย์ ORDER BY</label>
  <label>กำหนดส่ง<input name="due_date" type="date" defaultValue={record?.due_date??''}/></label>
  <input type="hidden" name="exercise" value={JSON.stringify(exercise)}/>
  <button type="button" disabled={busy} onClick={()=>void inspect()}>{busy?'กำลังตรวจสอบ…':'ตรวจสอบและดูผลเฉลย'}</button>
  {error&&<p className="td-alert" role="alert">{error}</p>}
  {preview&&<section className="mission-preview" aria-label="ผลตรวจสอบภารกิจ"><p role="status">พร้อมใช้ ข้อมูลและเฉลยทำงานร่วมกันได้</p><MissionTables tables={exercise.tables}/><h3>ผลลัพธ์ที่คาดหวัง</h3>{preview.map((result,i)=><div className="td-table-wrap" key={i}><table><thead><tr>{result.columns.map((c,j)=><th key={j}>{c}</th>)}</tr></thead><tbody>{result.values.map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}>{cell===null?'NULL':String(cell)}</td>)}</tr>)}</tbody></table><p>{result.values.length} แถว</p></div>)}</section>}
 </div>;
}
