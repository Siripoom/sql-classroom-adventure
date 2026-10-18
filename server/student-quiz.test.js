import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStudentQuiz,StudentQuizRevisionError} from '../src/student/student-quiz-model.ts';

const open={kind:'pre',status:'open',revision:'rev-1',questions:[{id:'q1',prompt:'เลือกคำสั่ง',options:['SELECT','WHERE','JOIN','COUNT']}],result:null};

test('student quiz parsing keeps question text but rejects answer keys',()=>{
 const quiz=parseStudentQuiz(open);
 assert.equal(quiz.status,'open');
 assert.deepEqual(quiz.questions[0],{id:'q1',prompt:'เลือกคำสั่ง',options:['SELECT','WHERE','JOIN','COUNT']});
 assert.equal('correct_option' in quiz.questions[0],false);
});

test('submitted quiz parsing returns a terminal result',()=>{
 const quiz=parseStudentQuiz({kind:'post',status:'submitted',revision:'rev-2',questions:[],result:{correct:2,total:3,score:66.7,answered:2,unanswered:1,submittedAt:'2026-10-17T13:00:00.000Z'}});
 assert.deepEqual(quiz.status,'submitted');
 if(quiz.status==='submitted')assert.deepEqual(quiz.result,{correct:2,total:3,score:66.7,answered:2,unanswered:1,submittedAt:'2026-10-17T13:00:00.000Z'});
});

test('unavailable quiz parsing is terminal without answer controls',()=>{
 assert.deepEqual(parseStudentQuiz({kind:'pre',status:'unavailable',revision:null,questions:[],result:null}),{kind:'pre',status:'unavailable',revision:null,questions:[],result:null});
});

test('malformed questions and revision responses fail at the boundary',()=>{
 assert.throws(()=>parseStudentQuiz({...open,questions:[{...open.questions[0],options:['only one']}]}),/ข้อมูลคำถามไม่ถูกต้อง/);
 assert.throws(()=>parseStudentQuiz({kind:'pre',status:'revision_changed',revision:'rev-2',questions:open.questions}),StudentQuizRevisionError);
 assert.throws(()=>parseStudentQuiz({kind:'pre',status:'invalid_answers',message:'คำตอบไม่ถูกต้อง'}),/คำตอบไม่ถูกต้อง/);
});
