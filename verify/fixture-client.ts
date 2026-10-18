type Row=Record<string,any>;
type Op='select'|'insert'|'update'|'delete'|'upsert';

const topics=['SELECT','WHERE','ORDER BY','GROUP BY','JOIN'];
const topicCounts=[6,5,5,4,4];
const named=[
 ['นายกิตติพงษ์ ใจดี',20,92,68,94,12.5],['นางสาวสุชาดา มั่นคง',18,85,62,88,10.8],['นายธนภัทร ศรีสวัสดิ์',15,78,55,82,9.6],
 ['นางสาวปิยธิดา คำมา',12,70,48,75,8.3],['นายศุภกร แสงทอง',10,65,40,70,6.7],['นางสาววรัญญา นิลสกุล',6,52,35,58,5.1]
] as const;
const firstNames=['สมชาย','สมหญิง','วิชัย','มาลี','ประเสริฐ','กาญจนา','อนุชา','ศิริพร','ธีรวัฒน์','พิมพ์ชนก','ณัฐวุฒิ','ชลธิชา'];
const lastNames=['สุขสวัสดิ์','ทองดี','แก้วมณี','บุญมา','พึ่งพา','รัตนะ','จันทร์เพ็ญ','วงศ์ใหญ่'];

function seeded(seed:number){return ()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296}}

function buildSeed(){
 const rand=seeded(7),teacher='teacher-fixture';
 const classes:Row[]=[
  {id:'c1',join_code:'AB3K9Z',teacher_id:teacher,name:'ปวช. 2/1',subject:'ฐานข้อมูลและ SQL',term:'1/2569',created_at:'2026-01-01'},
  {id:'c2',join_code:'CD4M7X',teacher_id:teacher,name:'ปวช. 2/2',subject:'ฐานข้อมูลและ SQL',term:'1/2569',created_at:'2026-01-02'},
  {id:'c3',join_code:'EF5N8Y',teacher_id:teacher,name:'ปวส. 1/1',subject:'การออกแบบฐานข้อมูล',term:'1/2569',created_at:'2026-01-03'}
 ];
 const missions:Row[]=[];
 let n=0;
 topics.forEach((topic,ti)=>{for(let i=0;i<topicCounts[ti];i++){
  const difficulty=n<8?'easy':n<18?'medium':'hard';
  missions.push({id:'m'+n,teacher_id:teacher,class_id:'c1',title:`ภารกิจ ${topic} #${i+1}`,topic,difficulty,description:`ฝึกใช้ ${topic} กับตารางนักเรียน`,due_date:n%3===0?'2026-12-01':null,created_at:`2026-02-${String(n+1).padStart(2,'0')}`});
  n++;
 }});
 missions.push({id:'m-c2',teacher_id:teacher,class_id:'c2',title:'ภารกิจ SELECT แรก',topic:'SELECT',difficulty:'easy',description:'',due_date:null,created_at:'2026-03-01'});
 const students:Row[]=[],results:Row[]=[];
 for(let i=0;i<43;i++){
  const row=named[i];
  const done=row?row[1]:Math.floor(rand()*25);
  const avg=row?row[2]:Math.round(40+rand()*55);
  const hours=row?row[5]:Math.round((2+rand()*10)*10)/10;
  const name=row?row[0]:`${rand()>.5?'นาย':'นางสาว'}${firstNames[i%firstNames.length]} ${lastNames[(i*3)%lastNames.length]}`;
  const id='s'+i;
  students.push({id,teacher_id:teacher,class_id:'c1',student_code:String(66001+i),name,pre_test:row?row[3]:Math.round(30+rand()*40),post_test:row?row[4]:i%9===0?null:Math.round(50+rand()*45),created_at:'2026-01-10'});
  for(let j=0;j<24;j++)results.push({id:`r${i}-${j}`,teacher_id:teacher,class_id:'c1',student_id:id,mission_id:'m'+j,score:avg,completed:j<done,minutes:j<done&&done?Math.round(hours*60/done):0});
 }
 students.push({id:'s-c2',teacher_id:teacher,class_id:'c2',student_code:'66901',name:'นายทดสอบ ห้องสอง',pre_test:null,post_test:null,created_at:'2026-01-11'});
 students.push({id:'s-c3-named',teacher_id:teacher,class_id:'c3',student_code:'70001',name:'นางสาวมะลิ ชื่อแล้ว',pre_test:null,post_test:null,name_confirmed:true,created_at:'2026-01-12'});
 students.push({id:'s-c3-pending',teacher_id:teacher,class_id:'c3',student_code:'70002',name:'70002',pre_test:null,post_test:null,name_confirmed:false,created_at:'2026-01-13'});
 const questions:Row[]=[],attempts:Row[]=[];
 (['pre','post'] as const).forEach(kind=>{for(let i=0;i<5;i++){const correct=(i+(kind==='post'?1:0))%4;questions.push({id:`q-${kind}-${i}`,class_id:'c1',kind,prompt:`${kind==='pre'?'ก่อน':'หลัง'}เรียน: คำถาม SQL เรื่อง ${['SELECT','WHERE','ORDER BY','GROUP BY','JOIN'][i]}`,options:[`ตัวเลือก SQL ${i+1} ก`,`ตัวเลือก SQL ${i+1} ข`,`ตัวเลือก SQL ${i+1} ค`,`ตัวเลือก SQL ${i+1} ง`],correct_option:correct,created_at:`2026-04-${String(i+1+(kind==='post'?5:0)).padStart(2,'0')}`})}});
 for(let i=0;i<30;i++){
  const student=students[i];
  (i%4===0?['pre']:['pre','post'] as const).forEach(kind=>{const answers:Record<string,number>={};questions.filter(q=>q.kind===kind).forEach(question=>{const low=i%10===0;answers[question.id]=low?(question.correct_option+1)%4:rand()>.2?question.correct_option:(question.correct_option+1)%4});attempts.push({id:`a-${kind}-${student.id}`,class_id:'c1',student_id:student.id,kind,answers,created_at:'2026-04-20'})});
 }
 return {classroom_groups:classes,classroom_students:students,classroom_missions:missions,classroom_results:results,classroom_quiz_questions:questions,classroom_quiz_attempts:attempts} as Record<string,Row[]>;
}

const db=buildSeed();
const children:Record<string,[string,string][]>={
 classroom_groups:[['classroom_students','class_id'],['classroom_missions','class_id'],['classroom_results','class_id'],['classroom_quiz_questions','class_id'],['classroom_quiz_attempts','class_id']],
 classroom_students:[['classroom_results','student_id'],['classroom_quiz_attempts','student_id']],
 classroom_missions:[['classroom_results','mission_id']],
 classroom_quiz_questions:[],
 classroom_quiz_attempts:[],
 classroom_results:[]
};
let counter=0;

class Query implements PromiseLike<{data:any;error:any}>{
 private cols='';private op:Op='select';private payload:any;private filters:[string,unknown][]=[];private orderBy='';private conflict='';private rangeFrom=0;private rangeTo=999;
 constructor(private table:string){}
 select(cols?:string){this.op='select';this.cols=cols??'';return this}
 order(col:string){this.orderBy=col;return this}
 range(from:number,to:number){this.rangeFrom=Math.max(0,from);this.rangeTo=Math.min(to,this.rangeFrom+999);return this}
 insert(payload:Row|Row[]){this.op='insert';this.payload=payload;return this}
 update(payload:Row){this.op='update';this.payload=payload;return this}
 upsert(payload:Row,options?:{onConflict?:string}){this.op='upsert';this.payload=payload;this.conflict=options?.onConflict??'';return this}
 delete(){this.op='delete';return this}
 eq(col:string,value:unknown){this.filters.push([col,value]);return this}
 then<A,B>(ok?:((v:{data:any;error:any})=>A|PromiseLike<A>)|null,fail?:((e:unknown)=>B|PromiseLike<B>)|null){return Promise.resolve(this.run()).then(ok,fail)}
 private match(row:Row){return this.filters.every(([c,v])=>row[c]===v)}
 private run(){
  const rows=db[this.table];
  if(this.op==='select'){
   if(this.table==='classroom_groups'&&this.cols.includes('join_code')&&location.search.includes('oldschema'))return {data:null,error:{code:'42703',message:'column classroom_groups.join_code does not exist'}};
   const data=rows.filter(r=>this.match(r)).map(r=>({...r}));
   if(this.orderBy)data.sort((a,b)=>String(a[this.orderBy]??'').localeCompare(String(b[this.orderBy]??''),'th'));
   const out=data.slice(this.rangeFrom,this.rangeTo+1).slice(0,1000);
   return {data:this.table==='classroom_groups'&&location.search.includes('oldschema')?out.map(({join_code:_j,...rest}:any)=>rest):out,error:null};
  }
  if(this.op==='insert'){
   for(const item of [].concat(this.payload)as Row[]){
    if(this.table==='classroom_students'&&rows.some(r=>r.class_id===item.class_id&&r.student_code===item.student_code))return {data:null,error:{code:'23505'}};
    rows.push({id:'new'+(++counter),teacher_id:'teacher-fixture',created_at:new Date().toISOString(),subject:'ฐานข้อมูลและ SQL',term:'',description:'',...item});
   }
   return {data:null,error:null};
  }
  if(this.op==='update'){rows.filter(r=>this.match(r)).forEach(r=>Object.assign(r,this.payload));return {data:null,error:null}}
  if(this.op==='upsert'){
   const keys=this.conflict.split(',');const hit=rows.find(r=>keys.every(k=>r[k]===this.payload[k]));
   if(hit)Object.assign(hit,this.payload);else rows.push({id:'new'+(++counter),teacher_id:'teacher-fixture',...this.payload});
   return {data:null,error:null};
  }
  const doomed=rows.filter(r=>this.match(r));
  db[this.table]=rows.filter(r=>!doomed.includes(r));
  for(const [child,col] of children[this.table])for(const d of doomed)db[child]=db[child].filter(r=>r[col]!==d.id);
  return {data:null,error:null};
 }
}

export const supabase={from:(table:string)=>new Query(table)};
