import {BookOpen} from 'lucide-react';
import {findTopicNote} from './topic-notes.ts';
import './topic-notes.css';

export function TopicNotes({topic}:{topic:string}){
 const note=findTopicNote(topic);
 if(!note)return null;
 return <article className="topic-notes" aria-label={`ใบเนื้อหา ${note.topic}`}>
  <div className="topic-notes-header"><BookOpen size={24} aria-hidden="true"/><h2>ใบเนื้อหา · {note.topic}</h2></div>
  <div className="topic-notes-body">
   <p>{note.intro}</p>
   <p className="topic-notes-guide">อ่านตามลำดับเพื่อเตรียมทำภารกิจทั้ง 6 ข้อ หรือเลือกทบทวนหัวข้อที่ยังไม่เข้าใจ ตัวอย่างใช้ข้อมูลร้านสหกรณ์และชมรมเหมือนในภารกิจ</p>
   {note.sections.map(section=><section key={section.title}>
    <h3>{section.title}</h3><p>{section.body}</p>
    <pre tabIndex={0} aria-label={`ตัวอย่าง SQL ${section.title}`}><code>{section.sql}</code></pre>
    <p className="topic-notes-result"><b>อ่านผลลัพธ์:</b> {section.result}</p>
   </section>)}
   <div className="topic-notes-reminder"><b>จำก่อนลงมือทำ</b><p>{note.remember}</p></div>
   <p>พร้อมแล้ว เลื่อนลงไปอ่านโจทย์และลงมือทำภารกิจได้เลย</p>
  </div>
 </article>;
}
