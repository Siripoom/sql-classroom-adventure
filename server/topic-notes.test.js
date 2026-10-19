import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {topicNotes,findTopicNote} from '../src/student/topic-notes.ts';
import {runMissionQuery} from '../src/mission-sql.ts';

test('all five topic notes have six runnable examples on the classroom dataset',async()=>{
 const SQL=await initSqlJs(),db=new SQL.Database();
 try{
  db.run(`CREATE TABLE products(id INTEGER,name TEXT,category TEXT,price REAL,stock INTEGER);
   INSERT INTO products VALUES (1,'สมุด','เครื่องเขียน',25,40),(2,'ปากกา','เครื่องเขียน',10,100),(3,'ดินสอ','เครื่องเขียน',10,60),(4,'กระเป๋า','อุปกรณ์',250,8),(5,'ไม้บรรทัด','เครื่องเขียน',15,30),(6,'ขวดน้ำ','อุปกรณ์',80,15),(7,'นม','อาหาร',15,20),(8,'ขนมปัง','อาหาร',20,0);
   CREATE TABLE students(id INTEGER,name TEXT,club_id INTEGER);
   INSERT INTO students VALUES (1,'มะลิ',1),(2,'ภูมิ',2),(3,'ฟ้า',1),(4,'ต้น',NULL),(5,'ดาว',3),(6,'น้ำ',2);
   CREATE TABLE clubs(id INTEGER,title TEXT);
   INSERT INTO clubs VALUES (1,'หุ่นยนต์'),(2,'ดนตรี'),(3,'ศิลปะ'),(4,'กีฬา');`);
  const counts={'SELECT':[8,8,8,8,3,8],'WHERE':[4,3,2,4,4,2],'ORDER BY':[8,8,8,3,8,3],'GROUP BY':[3,3,3,3,1,3],'JOIN':[5,2,6,1,4,2]};
  assert.deepEqual(topicNotes.map(note=>note.topic),Object.keys(counts));
  for(const note of topicNotes){
   assert.equal(note.sections.length,6);
   note.sections.forEach((section,index)=>assert.equal(runMissionQuery(db,section.sql)[0].values.length,counts[note.topic][index],`${note.topic}: ${section.title}`));
  }
  assert.deepEqual(runMissionQuery(db,findTopicNote('GROUP BY').sections[5].sql)[0].values,[['อุปกรณ์',3200],['เครื่องเขียน',3050],['อาหาร',300]]);
  assert.deepEqual(runMissionQuery(db,findTopicNote('JOIN').sections[5].sql)[0].values,[['หุ่นยนต์',2],['ดนตรี',2]]);
  assert.equal(findTopicNote('unknown'),undefined);
 }finally{db.close();}
});
