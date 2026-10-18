import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDesks, currentDesk, deskState, profileSummary, waitingOn} from '../src/student/classroom-model.ts';
import {progressKey, readCompleted, storeCompleted} from '../src/student/student-progress.ts';

const exercise={version:1,tables:[{name:'t',columns:[{name:'id',type:'INTEGER'}],rows:[[1]]}],answerSql:'SELECT id FROM t',starterSql:'',hint:'',rowOrder:'any'};
const mission=(id,topic='SELECT',overrides={})=>({id,title:`ภารกิจ ${id}`,topic,difficulty:'easy',description:'โจทย์',due_date:null,exercise,...overrides});
const snapshot=(overrides={})=>({
 missions:[mission('m1'),mission('m2','WHERE'),mission('m3','JOIN')],
 unconfiguredMissionCount:0,
 questionCounts:{pre:5,post:4},
 attempted:{pre:false,post:false},
 scores:{pre:null,post:null},
 ...overrides
});
const ids=desks=>desks.map(desk=>desk.id);
const states=(data,done)=>Object.fromEntries(buildDesks(data).map(desk=>[desk.id,deskState(desk,data,done)]));
const desk=(data,id)=>buildDesks(data).find(item=>item.id===id);
const preDone={pre:true,post:false};

test('desks are the pre-test, the teacher missions in the order given, then the post-test', () => {
 assert.deepEqual(ids(buildDesks(snapshot())),['pre','m1','m2','m3','post']);
 assert.deepEqual(buildDesks(snapshot()).map(item=>item.label),['Pre-test','ภารกิจ m1','ภารกิจ m2','ภารกิจ m3','Post-test']);
});

test('a quiz without questions has no desk, and a class with nothing has no desks', () => {
 assert.deepEqual(ids(buildDesks(snapshot({questionCounts:{pre:0,post:0}}))),['m1','m2','m3']);
 assert.deepEqual(ids(buildDesks(snapshot({missions:[],questionCounts:{pre:0,post:0}}))),[]);
 assert.deepEqual(buildDesks(null),[]);
 assert.equal(currentDesk(snapshot({missions:[],questionCounts:{pre:0,post:0}}),[]),undefined);
});

test('a new student can only start the pre-test, every other desk is locked', () => {
 assert.deepEqual(states(snapshot(),[]),{pre:'open',m1:'locked',m2:'locked',m3:'locked',post:'locked'});
 assert.equal(currentDesk(snapshot(),[])?.id,'pre');
});

test('desks unlock one at a time as each one is finished', () => {
 const data=snapshot({attempted:preDone});
 assert.deepEqual(states(data,[]),{pre:'done',m1:'open',m2:'locked',m3:'locked',post:'locked'});
 assert.deepEqual(states(data,['m1']),{pre:'done',m1:'done',m2:'open',m3:'locked',post:'locked'});
 assert.deepEqual(states(data,['m1','m2','m3']),{pre:'done',m1:'done',m2:'done',m3:'done',post:'open'});
 assert.equal(currentDesk(data,['m1','m2'])?.id,'m3');
});

test('the post-test stays locked until every mission is done, then opens', () => {
 const data=snapshot({attempted:preDone});
 assert.equal(deskState(desk(data,'post'),data,['m1','m2']),'locked');
 assert.equal(deskState(desk(data,'post'),data,['m1','m2','m3']),'open');
 assert.equal(currentDesk(data,['m1','m2','m3'])?.id,'post');
});

test('without a pre-test the first mission opens straight away', () => {
 assert.equal(deskState(desk(snapshot({questionCounts:{pre:0,post:4}}),'m1'),snapshot({questionCounts:{pre:0,post:4}}),[]),'open');
});

test('waitingOn names the earlier desks still owed, in order', () => {
 const data=snapshot();
 assert.deepEqual(ids(waitingOn(desk(data,'m2'),data,[])),['pre','m1']);
 assert.deepEqual(ids(waitingOn(desk(data,'m2'),snapshot({attempted:preDone}),['m1'])),[]);
 assert.deepEqual(waitingOn(desk(data,'pre'),data,[]),[]);
 assert.deepEqual(ids(waitingOn(desk(data,'post'),data,['m1','m3'])),['pre','m2']);
});

test('a completed id that is no longer a mission of the class changes nothing', () => {
 assert.deepEqual(states(snapshot({attempted:preDone}),['deleted-mission']),{pre:'done',m1:'open',m2:'locked',m3:'locked',post:'locked'});
});

test('profile counts passed missions with their topic and state, quiz scores, and score gain', () => {
 const data=snapshot({attempted:{pre:true,post:true},scores:{pre:{correct:2,total:5,score:40},post:{correct:4,total:5,score:80}}});
 const profile=profileSummary(data,['m1']);
 assert.equal(profile.passed,1);
 assert.equal(profile.total,3);
 assert.deepEqual(profile.lessons,[{id:'m1',topic:'SELECT',title:'ภารกิจ m1',state:'done'},{id:'m2',topic:'WHERE',title:'ภารกิจ m2',state:'open'},{id:'m3',topic:'JOIN',title:'ภารกิจ m3',state:'locked'}]);
 assert.equal(profile.gain,40);
});

test('profile has no quiz scores, no missions and no gain without a classroom connection', () => {
 assert.deepEqual(profileSummary(null,[]),{lessons:[],passed:0,total:0,quizzes:{pre:null,post:null},gain:null});
});

const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}};
const mali={classCode:'AB3K9Z',studentCode:'66001'};

test('mission progress belongs to one student, so a new student starts with nothing done', () => {
 const storage=memory(),missions=[mission('m1'),mission('m2')];
 storeCompleted(storage,mali,['m1','m2'],missions);
 assert.deepEqual(readCompleted(storage,mali,missions),['m1','m2']);
 assert.deepEqual(readCompleted(storage,{classCode:'AB3K9Z',studentCode:'66002'},missions),[]);
 assert.deepEqual(readCompleted(storage,null,missions),[]);
});

test('the same student gets the same progress however the codes are typed', () => {
 assert.equal(progressKey({classCode:' ab3k9z ',studentCode:' ABC1 '}),progressKey({classCode:'AB3K9Z',studentCode:'abc1'}));
 assert.notEqual(progressKey({classCode:'AB3K9Z',studentCode:'abc1'}),progressKey({classCode:'CD4M7X',studentCode:'abc1'}));
});

test('changing the text or the exercise of a passed mission makes it owed again, changing only its due date or level does not', () => {
 const storage=memory(),before=mission('m1');
 storeCompleted(storage,mali,['m1'],[before]);
 assert.deepEqual(readCompleted(storage,mali,[mission('m1','SELECT',{difficulty:'hard',due_date:'2026-12-01'})]),['m1']);
 assert.deepEqual(readCompleted(storage,mali,[mission('m1','SELECT',{description:'โจทย์ใหม่'})]),[]);
 assert.deepEqual(readCompleted(storage,mali,[mission('m1','SELECT',{exercise:{...exercise,answerSql:'SELECT 2'}})]),[]);
 assert.deepEqual(readCompleted(storage,mali,[mission('m1','SELECT',{exercise:{...exercise,tables:[{...exercise.tables[0],rows:[[1],[2]]}]}})]),[]);
});

test('stored progress is cleaned: unknown mission ids and corrupt entries read as not done', () => {
 const storage=memory(),missions=[mission('m1')];
 storeCompleted(storage,mali,['m1'],missions);
 const good=storage.data.get(progressKey(mali));
 storage.data.set(progressKey(mali),good.replace('"m1"','"gone"'));
 assert.deepEqual(readCompleted(storage,mali,missions),[]);
 for(const corrupt of ['{oops','[1,2]','null','"m1"','{"m1":1}'])assert.deepEqual((storage.data.set(progressKey(mali),corrupt),readCompleted(storage,mali,missions)),[]);
});
