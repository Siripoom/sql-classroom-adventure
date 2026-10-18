import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanStudentName, clearStoredCodes, normalizeClassCode, normalizeStudentCode, parseNameOutcome, parseStudentClassroom, readStoredCodes, storeCodes} from '../src/student/student-access.ts';
import {deskState, buildDesks} from '../src/student/classroom-model.ts';

const exercise={version:1,tables:[{name:'products',columns:[{name:'id',type:'INTEGER'},{name:'price',type:'REAL'}],rows:[[1,25],[2,null]]}],answerSql:'SELECT id FROM products',starterSql:'SELECT ',hint:'ใช้ SELECT',rowOrder:'any'};
const mission=(id,title)=>({id,title,topic:'SELECT',difficulty:'easy',description:'โจทย์',due_date:null,exercise});
const reply={
 name:'มะลิ',
 needsName:false,
 missions:[mission('m1','ภารกิจแรก'),mission('m2','ภารกิจสอง')],
 unconfiguredMissionCount:1,
 questionCounts:{pre:3,post:0},
 attempted:{pre:true,post:false},
 scores:{pre:{correct:2,total:3,score:66.7},post:null}
};

test('class code is trimmed and upper-cased, student code only trimmed', () => {
 assert.equal(normalizeClassCode('  ab3k9z '),'AB3K9Z');
 assert.equal(normalizeStudentCode(' 66001 '),'66001');
});

test('an unknown code pair (null reply) is not a classroom', () => {
 assert.equal(parseStudentClassroom(null),null);
});

test('a documented reply becomes the name and the classroom snapshot', () => {
 assert.deepEqual(parseStudentClassroom(reply),{
  name:'มะลิ',
  needsName:false,
  snapshot:{missions:[mission('m1','ภารกิจแรก'),mission('m2','ภารกิจสอง')],unconfiguredMissionCount:1,questionCounts:{pre:3,post:0},attempted:{pre:true,post:false},scores:{pre:{correct:2,total:3,score:66.7},post:null}}
 });
});

test('a malformed reply is rejected instead of silently unlocking desks', () => {
 assert.throws(()=>parseStudentClassroom({...reply,questionCounts:{pre:'3',post:0}}),/bad count/);
 assert.throws(()=>parseStudentClassroom({...reply,scores:{pre:{correct:1,total:3},post:null}}),/bad score/);
 assert.throws(()=>parseStudentClassroom({name:'x'}),/bad shape/);
 assert.throws(()=>parseStudentClassroom('oops'),/bad shape/);
});

test('the parsed snapshot marks the pre-test done, opens only the first mission, and locks the empty post-test', () => {
 const {snapshot}=parseStudentClassroom(reply);
 const state=(id,done=[])=>deskState(buildDesks(snapshot).find(desk=>desk.id===id),snapshot,done);
 assert.deepEqual(buildDesks(snapshot).map(desk=>desk.id),['pre','m1','m2']);
 assert.equal(state('pre'),'done');
 assert.equal(state('m1'),'open');
 assert.equal(state('m2'),'locked');
 assert.equal(state('m2',['m1']),'open');
});

test('a mission the teacher has not set up (exercise null) is counted, not played', () => {
 const {snapshot}=parseStudentClassroom({...reply,missions:[mission('m1','ภารกิจแรก'),{...mission('m2','ยังไม่พร้อม'),exercise:null}],unconfiguredMissionCount:undefined});
 assert.deepEqual(snapshot.missions.map(m=>m.id),['m1']);
 assert.equal(snapshot.unconfiguredMissionCount,1);
});

test('a reply from the old function (missionTopics, no missions) tells the admin which script to run', () => {
 const {missions:_missions,unconfiguredMissionCount:_count,...old}=reply;
 assert.throws(()=>parseStudentClassroom({...old,missionTopics:['SELECT']}),/teacher-missions\.sql/);
});

test('a malformed mission or a repeated mission id is refused instead of reaching the lab', () => {
 const bad=patch=>({...reply,missions:[{...mission('m1','x'),...patch}]});
 assert.throws(()=>parseStudentClassroom(bad({difficulty:'impossible'})),/ข้อมูลภารกิจไม่ถูกต้อง/);
 assert.throws(()=>parseStudentClassroom(bad({exercise:{...exercise,tables:[]}})),/ตารางตัวอย่าง/);
 assert.throws(()=>parseStudentClassroom(bad({exercise:{...exercise,answerSql:'  '}})),/คำตอบ SQL/);
 assert.throws(()=>parseStudentClassroom(bad({exercise:{...exercise,tables:[{...exercise.tables[0],rows:[[1]]}]}})),/จำนวนค่าในแถว/);
 assert.throws(()=>parseStudentClassroom({...reply,missions:[mission('m1','a'),mission('m1','b')]}),/รหัสภารกิจซ้ำ/);
 assert.throws(()=>parseStudentClassroom({...reply,unconfiguredMissionCount:-1}),/bad count/);
});

test('codes survive a reload and a corrupted entry reads as signed out', () => {
 const data=new Map();
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 assert.equal(readStoredCodes(storage),null);
 storeCodes(storage,{classCode:'AB3K9Z',studentCode:'66001'});
 assert.deepEqual(readStoredCodes(storage),{classCode:'AB3K9Z',studentCode:'66001'});
 clearStoredCodes(storage);
 assert.equal(readStoredCodes(storage),null);
 data.set('sql-student-codes','{not json');
 assert.equal(readStoredCodes(storage),null);
});

test('a typed name has its whitespace collapsed and is refused when blank or over 100 characters', () => {
 assert.equal(cleanStudentName('  สมชาย    ใจดี \n'),'สมชาย ใจดี');
 assert.equal(cleanStudentName('   '),null);
 assert.equal(cleanStudentName('ก'.repeat(100)),'ก'.repeat(100));
 assert.equal(cleanStudentName('ก'.repeat(101)),null);
});

test('the classroom reply says whether the student still has to give a name', () => {
 assert.equal(parseStudentClassroom({...reply,needsName:true}).needsName,true);
 assert.equal(parseStudentClassroom(reply).needsName,false);
 assert.throws(()=>parseStudentClassroom({...reply,needsName:'yes'}),/bad shape/);
 const {needsName:_missing,...old}=reply;
 assert.throws(()=>parseStudentClassroom(old),/bad shape/);
});

test('the set-name reply is a status with the stored name, or null for an unknown code pair', () => {
 assert.equal(parseNameOutcome(null),null);
 assert.deepEqual(parseNameOutcome({status:'confirmed',name:'สมชาย ใจดี'}),{status:'confirmed',name:'สมชาย ใจดี'});
 assert.deepEqual(parseNameOutcome({status:'invalid',name:'70002'}),{status:'invalid',name:'70002'});
 assert.throws(()=>parseNameOutcome({status:'maybe',name:'x'}),/bad shape/);
 assert.throws(()=>parseNameOutcome({status:'confirmed'}),/bad shape/);
});
