import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeAttempt,quizRows,readAnswers,readQuestionForm,readQuestionBatch,withQuizScores} from '../src/teacher/quiz-model.ts';

const questions=[
 {id:'q1',class_id:'c1',kind:'pre',prompt:'หนึ่ง',options:['ก','ข','ค','ง'],correct_option:1},
 {id:'q2',class_id:'c1',kind:'pre',prompt:'สอง',options:['ก','ข','ค','ง'],correct_option:0},
 {id:'q3',class_id:'c1',kind:'pre',prompt:'สาม',options:['ก','ข','ค','ง'],correct_option:2}
];
const student={id:'s1',class_id:'c1',student_code:'001',name:'นักเรียนหนึ่ง',pre_test:10,post_test:null};

test('gradeAttempt counts right, wrong, and missing answers and ignores unknown ids',()=>{
 const grade=gradeAttempt(questions,{id:'a1',class_id:'c1',student_id:'s1',kind:'pre',answers:{q1:1,q2:2,unknown:0}});
 assert.deepEqual(grade,{correct:1,total:3,score:33.3});
 assert.deepEqual(gradeAttempt(questions,undefined),null);
 assert.deepEqual(gradeAttempt([],{id:'a1',class_id:'c1',student_id:'s1',kind:'pre',answers:{}}),null);
});

test('quizRows filters questions by each student class and reports gain or null',()=>{
 const rows=quizRows([
  student,
  {id:'s2',class_id:'c2',student_code:'002',name:'นักเรียนสอง',pre_test:null,post_test:20}
 ],[
  ...questions,
  {id:'q4',class_id:'c1',kind:'post',prompt:'หลังหนึ่ง',options:['ก','ข','ค','ง'],correct_option:0},
  {id:'q5',class_id:'c2',kind:'pre',prompt:'คนละห้อง',options:['ก','ข','ค','ง'],correct_option:0}
 ],[
  {id:'a1',class_id:'c1',student_id:'s1',kind:'pre',answers:{q1:1,q2:0,q3:2}},
  {id:'a2',class_id:'c1',student_id:'s1',kind:'post',answers:{q4:0,q5:0}},
  {id:'a3',class_id:'c2',student_id:'s2',kind:'pre',answers:{q5:0}}
 ]);
 assert.deepEqual(rows,[
  {student,pre:{correct:3,total:3,score:100},post:{correct:1,total:1,score:100},gain:0},
  {student:{id:'s2',class_id:'c2',student_code:'002',name:'นักเรียนสอง',pre_test:null,post_test:20},pre:{correct:1,total:1,score:100},post:null,gain:null}
 ]);
});

test('withQuizScores overrides manual values, falls back, and does not mutate students',()=>{
 const students=[
  student,
  {id:'s2',class_id:'c1',student_code:'002',name:'นักเรียนสอง',pre_test:30,post_test:40}
 ];
 const result=withQuizScores(students,[
  {id:'q1',class_id:'c1',kind:'pre',prompt:'ก่อน',options:['ก','ข','ค','ง'],correct_option:1},
  {id:'q2',class_id:'c1',kind:'post',prompt:'หลัง',options:['ก','ข','ค','ง'],correct_option:0}
 ],[
  {id:'a1',class_id:'c1',student_id:'s1',kind:'pre',answers:{q1:1}},
  {id:'a2',class_id:'c1',student_id:'s1',kind:'post',answers:{q2:2}}
 ]);
 assert.deepEqual(result,[
  {id:'s1',class_id:'c1',student_code:'001',name:'นักเรียนหนึ่ง',pre_test:100,post_test:0},
  {id:'s2',class_id:'c1',student_code:'002',name:'นักเรียนสอง',pre_test:30,post_test:40}
 ]);
 assert.deepEqual(students,[
  {id:'s1',class_id:'c1',student_code:'001',name:'นักเรียนหนึ่ง',pre_test:10,post_test:null},
  {id:'s2',class_id:'c1',student_code:'002',name:'นักเรียนสอง',pre_test:30,post_test:40}
 ]);
});

function questionForm(){
 const data=new FormData();
 data.set('prompt','  โจทย์ตัวอย่าง  ');
 data.set('option_0',' ก ');
 data.set('option_1',' ข ');
 data.set('option_2',' ค ');
 data.set('option_3',' ง ');
 data.set('correct_option','2');
 return data;
}

test('readQuestionForm trims the prompt and options',()=>{
 assert.deepEqual(readQuestionForm(questionForm()),{prompt:'โจทย์ตัวอย่าง',options:['ก','ข','ค','ง'],correct_option:2});
});

test('readQuestionForm rejects an empty prompt',()=>{
 const data=questionForm();data.set('prompt','   ');
 assert.throws(()=>readQuestionForm(data),{message:'กรุณากรอกโจทย์'});
});

test('readQuestionForm rejects an incomplete option list',()=>{
 const data=questionForm();data.set('option_3',' ');
 assert.throws(()=>readQuestionForm(data),{message:'กรุณากรอกตัวเลือกให้ครบทั้ง 4 ข้อ'});
});

test('readQuestionForm rejects a missing or invalid correct option',()=>{
 const missing=questionForm();missing.delete('correct_option');
 assert.throws(()=>readQuestionForm(missing),{message:'กรุณาเลือกข้อที่ถูกต้อง'});
 const invalid=questionForm();invalid.set('correct_option','4');
 assert.throws(()=>readQuestionForm(invalid),{message:'กรุณาเลือกข้อที่ถูกต้อง'});
});

test('readQuestionForm rejects an overlong prompt',()=>{
 const data=questionForm();data.set('prompt','ก'.repeat(1001));
 assert.throws(()=>readQuestionForm(data),{message:'โจทย์ยาวเกิน 1000 ตัวอักษร'});
});

test('readQuestionForm rejects an overlong option',()=>{
 const data=questionForm();data.set('option_0','ก'.repeat(301));
 assert.throws(()=>readQuestionForm(data),{message:'ตัวเลือกยาวเกิน 300 ตัวอักษร'});
});

test('readAnswers reads selected options and skips unanswered questions',()=>{
 const data=new FormData();data.set('q_q1','3');data.set('q_q2','');
 assert.deepEqual(readAnswers(data,questions),{q1:3});
});

test('readAnswers rejects an option outside the allowed range',()=>{
 const data=new FormData();data.set('q_q1','nope');
 assert.throws(()=>readAnswers(data,questions),{message:'คำตอบไม่ถูกต้อง'});
});

function appendQuestion(data,prefix,prompt,correct){
 data.append('question_prefix',prefix);
 data.set(`${prefix}prompt`,prompt);
 for(let i=0;i<4;i++)data.set(`${prefix}option_${i}`,`ตัวเลือก ${i}`);
 data.set(`${prefix}correct_option`,String(correct));
}

test('question batches preserve remaining form order and independent answers after removing drafts',()=>{
 const data=new FormData();
 appendQuestion(data,'question_2_','  ข้อแรกที่เหลือ  ',3);
 appendQuestion(data,'question_4_','ข้อถัดไป',1);
 data.set('question_1_prompt','ข้อที่ถูกลบ');
 const drafts=readQuestionBatch(data);
 assert.deepEqual(drafts.map(({prompt,correct_option})=>({prompt,correct_option})),[
  {prompt:'ข้อแรกที่เหลือ',correct_option:3},{prompt:'ข้อถัดไป',correct_option:1}
 ]);
 assert.equal(drafts[0].options.length,4);
});

test('question batches reject the entire draft list and identify the invalid question',()=>{
 const data=new FormData();
 appendQuestion(data,'','ข้อหนึ่ง',0);
 appendQuestion(data,'question_1_','ข้อสอง',2);
 data.delete('question_1_option_3');
 assert.throws(()=>readQuestionBatch(data),/ข้อที่ 2: กรุณากรอกตัวเลือก/);
 data.set('question_1_option_3','ครบแล้ว');
 data.delete('question_1_correct_option');
 assert.throws(()=>readQuestionBatch(data),/ข้อที่ 2: กรุณาเลือกข้อที่ถูกต้อง/);
 data.set('question_1_correct_option','3');
 assert.equal(readQuestionBatch(data).length,2);
 assert.throws(()=>readQuestionBatch(new FormData()),/อย่างน้อย 1 ข้อ/);
});
