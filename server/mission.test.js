import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {EXAMPLE_EXERCISE, missionRevision, parseMissionExercise} from '../src/mission-contract.ts';
import {createMissionDatabase, resultsMatch, runMissionQuery, validateMissionExercise} from '../src/mission-sql.ts';

const SQL=await initSqlJs();
const copy=value=>structuredClone(value);
const table=(name,columns,rows)=>({name,columns:columns.map(([n,type])=>({name:n,type})),rows});
const exercise=(overrides={})=>({...copy(EXAMPLE_EXERCISE),...overrides});

test('the teacher example exercise parses and its answer returns the two products priced 25 or more', () => {
 assert.deepEqual(validateMissionExercise(SQL,parseMissionExercise(EXAMPLE_EXERCISE)),[{columns:['name','price'],values:[['สมุด',25],['กระเป๋า',250]]}]);
});

test('an exercise with a join across two teacher tables runs on exactly the rows the teacher typed', () => {
 const join=exercise({
  tables:[table('students',[['id','INTEGER'],['name','TEXT'],['club_id','INTEGER']],[[1,'มะลิ',10],[2,'ภูมิ',null]]),table('clubs',[['id','INTEGER'],['title','TEXT']],[[10,'หุ่นยนต์']])],
  answerSql:'SELECT students.name, clubs.title FROM students JOIN clubs ON students.club_id = clubs.id'
 });
 assert.deepEqual(validateMissionExercise(SQL,join),[{columns:['name','title'],values:[['มะลิ','หุ่นยนต์']]}]);
});

test('NULL cells and an empty table survive into the student database', () => {
 const db=createMissionDatabase(SQL,exercise({tables:[table('t',[['id','INTEGER'],['note','TEXT']],[[1,null]]),table('empty',[['id','INTEGER']],[])]}));
 assert.deepEqual(runMissionQuery(db,'SELECT id, note FROM t'),[{columns:['id','note'],values:[[1,null]]}]);
 assert.deepEqual(runMissionQuery(db,'SELECT COUNT(*) AS n FROM empty'),[{columns:['n'],values:[[0]]}]);
 db.close();
});

test('the student database is rebuilt from the exercise each time, so nothing a student ran leaks into the next open', () => {
 const first=createMissionDatabase(SQL,EXAMPLE_EXERCISE);
 assert.throws(()=>runMissionQuery(first,'DELETE FROM products'),/SELECT/);
 first.close();
 const second=createMissionDatabase(SQL,EXAMPLE_EXERCISE);
 assert.deepEqual(runMissionQuery(second,'SELECT COUNT(*) AS n FROM products'),[{columns:['n'],values:[[3]]}]);
 second.close();
});

test('only one SELECT is accepted: writes, stacked statements, and SELECT-looking comments are refused', () => {
 const db=createMissionDatabase(SQL,EXAMPLE_EXERCISE);
 for(const sql of ['DROP TABLE products','INSERT INTO products VALUES (9,\'x\',1)','UPDATE products SET price=0','SELECT 1; DROP TABLE products','-- SELECT\nDELETE FROM products','PRAGMA query_only = OFF','ATTACH DATABASE \'x\' AS x',''])assert.throws(()=>runMissionQuery(db,sql));
 assert.deepEqual(runMissionQuery(db,'SELECT COUNT(*) AS n FROM products;'),[{columns:['n'],values:[[3]]}]);
 assert.deepEqual(runMissionQuery(db,"SELECT 'a;b' AS v"),[{columns:['v'],values:[['a;b']]}]);
 db.close();
});

test('a WITH query is refused because the lab only runs plain SELECT', () => {
 const db=createMissionDatabase(SQL,EXAMPLE_EXERCISE);
 assert.throws(()=>runMissionQuery(db,'WITH x AS (SELECT 1) SELECT * FROM x'),/SELECT/);
 db.close();
});

test('a result over 5000 rows is refused instead of freezing the page', () => {
 const db=createMissionDatabase(SQL,EXAMPLE_EXERCISE);
 assert.throws(()=>runMissionQuery(db,'SELECT a.id FROM products a, products b, products c, products d, products e, products f, products g, products h, products i, products j, products k, products l, products m, products n'),/5000/);
 db.close();
});

test('an answer that does not run on the teacher tables is caught before students see it', () => {
 assert.throws(()=>validateMissionExercise(SQL,exercise({answerSql:'SELECT missing FROM products'})),/missing/);
 assert.throws(()=>validateMissionExercise(SQL,exercise({answerSql:'SELECT name FROM nowhere'})),/nowhere/);
 assert.throws(()=>validateMissionExercise(SQL,exercise({answerSql:'DELETE FROM products'})),/SELECT/);
});

test('judging compares column names and values, ignores row order unless the teacher asks for it', () => {
 const run=sql=>{const db=createMissionDatabase(SQL,EXAMPLE_EXERCISE);try{return runMissionQuery(db,sql)}finally{db.close()}};
 const answer=run('SELECT name FROM products ORDER BY id');
 assert.equal(resultsMatch(run('SELECT name FROM products ORDER BY id DESC'),answer,'any'),true);
 assert.equal(resultsMatch(run('SELECT name FROM products ORDER BY id DESC'),answer,'exact'),false);
 assert.equal(resultsMatch(run('SELECT name FROM products ORDER BY id'),answer,'exact'),true);
 assert.equal(resultsMatch(run('SELECT name AS n FROM products'),answer,'any'),false);
 assert.equal(resultsMatch(run('SELECT name FROM products WHERE id < 3'),answer,'any'),false);
 assert.equal(resultsMatch(run('SELECT name FROM products UNION ALL SELECT name FROM products'),answer,'any'),false);
});

test('the contract refuses shapes the lab cannot build', () => {
 const bad={
  'no table':exercise({tables:[]}),
  'nine tables':exercise({tables:Array.from({length:9},(_,i)=>table(`t${i}`,[['id','INTEGER']],[]))}),
  'unsafe table name':exercise({tables:[table('a b',[['id','INTEGER']],[])]}),
  'reserved table name':exercise({tables:[table('sqlite_master',[['id','INTEGER']],[])]}),
  'duplicate table (case-insensitive)':exercise({tables:[table('t',[['id','INTEGER']],[]),table('T',[['id','INTEGER']],[])]}),
  'duplicate column':exercise({tables:[table('t',[['id','INTEGER'],['ID','TEXT']],[])]}),
  'unknown type':exercise({tables:[table('t',[['id','BLOB']],[])]}),
  'ragged row':exercise({tables:[table('t',[['id','INTEGER'],['n','TEXT']],[[1]])]}),
  'text in an INTEGER column':exercise({tables:[table('t',[['id','INTEGER']],[['x']])]}),
  'fractional INTEGER':exercise({tables:[table('t',[['id','INTEGER']],[[1.5]])]}),
  'number in a TEXT column':exercise({tables:[table('t',[['n','TEXT']],[[7]])]}),
  'NaN':exercise({tables:[table('t',[['x','REAL']],[[NaN]])]}),
  'over 200 rows':exercise({tables:[table('t',[['id','INTEGER']],Array.from({length:201},(_,i)=>[i]))]}),
  'blank answer':exercise({answerSql:'   '}),
  'unknown row order':exercise({rowOrder:'sorted'}),
  'wrong version':{...copy(EXAMPLE_EXERCISE),version:2},
 };
 for(const [label,value] of Object.entries(bad))assert.throws(()=>parseMissionExercise(value),Error,label);
});

test('a hand-written table name cannot break out of CREATE TABLE', () => {
 assert.throws(()=>parseMissionExercise(exercise({tables:[table('t"); DROP TABLE x; --',[['id','INTEGER']],[])]})));
});

test('missionRevision changes with the title, the task text, and every part of the exercise, but not with level or due date', () => {
 const base={id:'m',title:'a',topic:'SELECT',difficulty:'easy',description:'d',due_date:null,exercise:EXAMPLE_EXERCISE};
 const rev=missionRevision(base);
 assert.equal(missionRevision({...base,difficulty:'hard',due_date:'2026-01-01',topic:'WHERE'}),rev);
 for(const changed of [{title:'b'},{description:'e'},{exercise:{...EXAMPLE_EXERCISE,hint:'h'}},{exercise:{...EXAMPLE_EXERCISE,starterSql:'S'}},{exercise:{...EXAMPLE_EXERCISE,rowOrder:'exact'}}])assert.notEqual(missionRevision({...base,...changed}),rev);
});
