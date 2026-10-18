import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenizeSql} from '../src/student/sql-highlight.ts';

const kinds=sql=>tokenizeSql(sql).filter(t=>t.kind!=='plain').map(t=>`${t.kind}:${t.text}`);

test('keywords are found without regard to case, identifiers are not', () => {
 assert.deepEqual(kinds('select name FROM students'),['keyword:select','keyword:FROM']);
});
test('strings, numbers and comments are separate tokens', () => {
 assert.deepEqual(kinds("WHERE score >= 80 AND name = 'มะลิ' -- เช็ก"),['keyword:WHERE','number:80','keyword:AND','string:\'มะลิ\'','comment:-- เช็ก']);
});
test('keywords inside strings and comments stay plain text of that token', () => {
 assert.deepEqual(kinds("'SELECT' -- FROM"),["string:'SELECT'",'comment:-- FROM']);
});
test('an unfinished string runs to the end instead of breaking the rest', () => {
 assert.deepEqual(kinds("SELECT 'abc"),['keyword:SELECT',"string:'abc"]);
});
test('digits inside identifiers are not numbers', () => {
 assert.deepEqual(kinds('SELECT col1, t2.id FROM t2'),['keyword:SELECT','keyword:FROM']);
});
test('joining the tokens gives the exact input back, including blank lines and Thai text', () => {
 const sql="-- เขียนคำสั่ง\n\nSELECT  COUNT(*) AS total\n  FROM students;\n";
 assert.equal(tokenizeSql(sql).map(t=>t.text).join(''),sql);
});
