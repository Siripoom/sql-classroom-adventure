import {useEffect,useRef,useState} from 'react';
import {LoaderCircle,UserRound} from 'lucide-react';
import {cleanStudentName,MAX_NAME_LENGTH} from './student-access.ts';

type Props={
 code:string;
 onSave:(name:string)=>Promise<string>;
 onSwitchStudent:()=>void;
};

export function StudentNameDialog({code,onSave,onSwitchStudent}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const [value,setValue]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal()},[]);
 const name=cleanStudentName(value);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!name||busy)return;
  setBusy(true);setError('');
  const message=await onSave(name);
  if(message){setError(message);setBusy(false)}
 }
 return <dialog ref={dialog} className="student-name-dialog" aria-labelledby="student-name-title" aria-describedby="student-name-help" onCancel={event=>event.preventDefault()}>
  <form onSubmit={submit} aria-busy={busy}>
   <span className="student-name-icon" aria-hidden="true"><UserRound size={30}/></span>
   <h2 id="student-name-title">ยินดีต้อนรับ! ขอรู้จักชื่อของคุณหน่อย</h2>
   <p id="student-name-help">ครูจะเห็นชื่อนี้ในรายชื่อนักเรียนและผลแบบทดสอบ ตั้งได้ครั้งเดียว หากพิมพ์ผิดให้แจ้งครูเพื่อแก้ไข</p>
   <label>ชื่อ-นามสกุล
    <input autoFocus autoComplete="name" value={value} onChange={event=>setValue(event.target.value)} placeholder="เช่น นายสมชาย ใจดี" disabled={busy} aria-invalid={Boolean(error)||[...value.trim()].length>MAX_NAME_LENGTH}/>
   </label>
   <small>รหัสนักเรียนของคุณคือ <b>{code}</b></small>
   {[...value.trim()].length>MAX_NAME_LENGTH&&<p className="student-name-error" role="alert">ชื่อยาวเกิน {MAX_NAME_LENGTH} ตัวอักษร</p>}
   {error&&<p className="student-name-error" role="alert">{error}</p>}
   <button className="student-name-save" disabled={!name||busy}>{busy?<><LoaderCircle className="student-spin" size={20}/>กำลังบันทึก…</>:'บันทึกและเข้าห้องเรียน'}</button>
   <button type="button" className="student-name-switch" disabled={busy} onClick={onSwitchStudent}>ใช้รหัสนักเรียนอื่น</button>
  </form>
 </dialog>;
}
