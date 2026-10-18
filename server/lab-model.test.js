import test from 'node:test';
import assert from 'node:assert/strict';
import {arrangePieces, judgeArrangement} from '../src/student/lab-model.ts';

const answers=['SELECT * FROM students','SELECT name FROM students','SELECT * FROM students WHERE score >= 80','SELECT * FROM students ORDER BY score DESC','SELECT COUNT(*) AS total FROM students','SELECT students.name, clubs.title FROM students JOIN clubs ON students.club_id = clubs.id'];
const lessons=answers.map((answer,i)=>({id:i+1,answer}));

test('the arrange pool holds every word of the answer exactly once', () => {
 for(const lesson of lessons){
  const pool=arrangePieces(lesson.answer,lesson.id);
  assert.deepEqual(pool.map(p=>p.text).sort(),lesson.answer.split(/\s+/).sort());
  assert.equal(new Set(pool.map(p=>p.id)).size,pool.length);
 }
});
test('the pool never starts in the solved order, and is the same on every call', () => {
 for(const lesson of lessons){
  const pool=arrangePieces(lesson.answer,lesson.id).map(p=>p.text).join(' ');
  assert.notEqual(pool,lesson.answer);
  assert.equal(pool,arrangePieces(lesson.answer,lesson.id).map(p=>p.text).join(' '));
 }
});
test('judging an arrangement: short is incomplete, right order is right, anything else is wrong', () => {
 const answer='SELECT name FROM students';
 assert.equal(judgeArrangement([],answer),'incomplete');
 assert.equal(judgeArrangement(['SELECT','name'],answer),'incomplete');
 assert.equal(judgeArrangement(['SELECT','name','FROM','students'],answer),'right');
 assert.equal(judgeArrangement(['name','SELECT','FROM','students'],answer),'wrong');
 assert.equal(judgeArrangement(['SELECT','name','FROM','students','students'],answer),'wrong');
});
test('the answer of every lesson is judged right when its words are placed in order', () => {
 for(const lesson of lessons)assert.equal(judgeArrangement(lesson.answer.split(/\s+/),lesson.answer),'right');
});
