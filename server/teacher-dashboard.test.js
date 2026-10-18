import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,makeReport,fetchAllPages} from '../src/teacher/model.ts';
const student={id:'s1',class_id:'c1',student_code:'001',name:'นักเรียน ทดสอบ',pre_test:null,post_test:0};
const missions=[{id:'m1'},{id:'m2'}];
test('progress includes uncompleted tasks, averages use only recorded results, zero scores are data',()=>{
 const result=summarize(student,missions,[{student_id:'s1',mission_id:'m1',score:0,completed:true,minutes:90},{student_id:'other',mission_id:'m2',score:100,completed:true,minutes:60}]);
 assert.equal(result.progress,50);assert.equal(result.average,0);assert.equal(result.hours,1.5);assert.equal(result.status,'ต้องการความช่วยเหลือ');
 assert.equal(summarize(student,missions,[]).average,null);
 assert.equal(summarize(student,[],[]).progress,0);
});
test('CSV protects formula-like names and quotes, preserves empty and zero test scores',()=>{
 const csv=makeReport([{...student,name:'=HYPERLINK("test")'}],missions,[]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""test"")"'));assert.ok(csv.includes('"","","0"'));
});

test('fetchAllPages reads every capped page in stable ranges and fails page errors',async()=>{
 const calls=[];
 const rows=await fetchAllPages(async(from,to)=>{calls.push([from,to]);const data=Array.from({length:from===0?1000:32},(_,i)=>from+i);return {data,error:null}});
 assert.equal(rows.length,1032);assert.deepEqual(calls,[[0,999],[1000,1999]]);
 await assert.rejects(()=>fetchAllPages(async()=>({data:null,error:new Error('page failed')})),/page failed/);
});
