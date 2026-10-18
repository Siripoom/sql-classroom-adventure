import test from 'node:test';
import assert from 'node:assert/strict';
import {difficultyLabel,followUpList,hardestMissions,prePostSummary,statusDistribution} from '../src/teacher/report-data.ts';

const students=[
 {id:'s1',class_id:'c1',student_code:'001',name:'หนึ่ง ศูนย์',pre_test:0,post_test:20},
 {id:'s2',class_id:'c1',student_code:'002',name:'สอง ดี',pre_test:50,post_test:40},
 {id:'s3',class_id:'c1',student_code:'003',name:'สาม ก่อน',pre_test:20,post_test:null},
 {id:'s4',class_id:'c1',student_code:'004',name:'สี่ หลัง',pre_test:null,post_test:90}
];
const missions=[
 {id:'m1',class_id:'c1',title:'เลือกข้อมูล',topic:'SELECT',difficulty:'easy',description:'',due_date:null},
 {id:'m2',class_id:'c1',title:'กรองข้อมูล',topic:'WHERE',difficulty:'medium',description:'',due_date:null},
 {id:'m3',class_id:'c1',title:'เรียงข้อมูล',topic:'ORDER BY',difficulty:'hard',description:'',due_date:null}
];
const results=[
 {id:'r1',class_id:'c1',student_id:'s1',mission_id:'m1',score:80,completed:true,minutes:30},
 {id:'r2',class_id:'c1',student_id:'s1',mission_id:'m2',score:0,completed:false,minutes:15},
 {id:'r3',class_id:'c1',student_id:'s2',mission_id:'m1',score:70,completed:true,minutes:45},
 {id:'r4',class_id:'c1',student_id:'s2',mission_id:'m2',score:80,completed:true,minutes:30}
];

test('pre/post summary keeps zero, ignores incomplete pairs, and ranks gains',()=>{
 const summary=prePostSummary(students);
 assert.deepEqual(summary,{pairCount:2,averagePre:25,averagePost:30,averageGain:5,improved:1,topImprovers:[
  {student:students[0],pre:0,post:20,gain:20},
  {student:students[1],pre:50,post:40,gain:-10}
 ]});
 assert.equal(prePostSummary([]).averageGain,null);
 assert.deepEqual(prePostSummary([{...students[2],post_test:null}]).topImprovers,[]);
});

test('status distribution returns keyed status order and safe percentages',()=>{
 assert.deepEqual(statusDistribution(students,missions,results).map(({status,count,percent})=>({status,count,percent})),[
  {status:'ดีเยี่ยม',count:0,percent:0},
  {status:'ดี',count:1,percent:25},
  {status:'ต้องพัฒนา',count:0,percent:0},
  {status:'ต้องการความช่วยเหลือ',count:1,percent:25},
  {status:'ยังไม่มีผล',count:2,percent:50}
 ]);
 assert.deepEqual(statusDistribution([],missions,results).map(({count,percent})=>({count,percent})),[
  {count:0,percent:0},{count:0,percent:0},{count:0,percent:0},{count:0,percent:0},{count:0,percent:0}
 ]);
});

test('follow-up list sorts missing results first and reports progress',()=>{
 const summary=followUpList(students,missions,results);
 assert.equal(summary.total,3);
 assert.equal(summary.omitted,0);
 assert.deepEqual(summary.items.map(row=>({name:row.student.name,status:row.status,average:row.average,completed:row.completed,progress:row.progress,hours:row.hours})),[
  {name:'สาม ก่อน',status:'ยังไม่มีผล',average:null,completed:0,progress:0,hours:0},
  {name:'สี่ หลัง',status:'ยังไม่มีผล',average:null,completed:0,progress:0,hours:0},
  {name:'หนึ่ง ศูนย์',status:'ต้องการความช่วยเหลือ',average:40,completed:1,progress:33,hours:0.8}
 ]);
 assert.deepEqual(followUpList([],missions,results),{items:[],total:0,omitted:0});
});

test('hardest missions includes nobody-completed mission and zero-student safety',()=>{
 assert.deepEqual([difficultyLabel('easy'),difficultyLabel('medium'),difficultyLabel('hard')],['ง่าย','ปานกลาง','ยาก']);
 assert.deepEqual(hardestMissions(missions,students,results).map(row=>({id:row.mission.id,completed:row.completed,total:row.total,rate:row.rate})),[
  {id:'m3',completed:0,total:4,rate:0},
  {id:'m2',completed:1,total:4,rate:25},
  {id:'m1',completed:2,total:4,rate:50}
 ]);
 assert.deepEqual(hardestMissions(missions,[],[]).map(row=>({id:row.mission.id,completed:row.completed,total:row.total,rate:row.rate})),[
  {id:'m2',completed:0,total:0,rate:0},
  {id:'m3',completed:0,total:0,rate:0},
  {id:'m1',completed:0,total:0,rate:0}
 ]);
});
