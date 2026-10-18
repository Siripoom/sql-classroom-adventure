import {useLayoutEffect, useRef, useState} from 'react';
import {ArrowRight, GraduationCap, Heart, UserRound, UsersRound, Mail, LockKeyhole, Eye, EyeOff} from 'lucide-react';
import './login.css';
import {supabase} from './supabase';
import {isTeacher} from './teacher-access';
import {normalizeClassCode, normalizeStudentCode, type StudentClassroom, type StudentCodes} from './student/student-access.ts';
import {loadStudentClassroom} from './student/student-session.ts';

export function Login({onStudent,notice=''}:{onStudent:(codes:StudentCodes,classroom:StudentClassroom)=>void;notice?:string}) {
  const [role,setRole]=useState<'student'|'teacher'>('teacher');
  const [classCode,setClassCode]=useState('');
  const [studentCode,setStudentCode]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(notice);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    setError('');
    if(role==='student'){
      const codes={classCode:normalizeClassCode(classCode),studentCode:normalizeStudentCode(studentCode)};
      if(!codes.classCode||!codes.studentCode)return;
      setBusy(true);
      try {
        const classroom=await loadStudentClassroom(codes);
        if(classroom)onStudent(codes,classroom);
        else setError('รหัสห้องเรียนไม่ถูกต้อง หรือห้องเต็ม กรุณาถามครูผู้สอน');
      } catch {setError('เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง');}
      finally {setBusy(false);}
      return;
    }
    if(!supabase){setError('ยังไม่ได้เชื่อมต่อระบบบัญชี กรุณาติดต่อผู้ดูแล');return;}
    setBusy(true);
    try {
      const {data,error:loginError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(loginError){
        setError(loginError.code==='email_not_confirmed'?'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ':loginError.status===429?'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่':'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
        return;
      }
      if(!isTeacher(data.user)){
        await supabase.auth.signOut({scope:'local'});
        setError('บัญชีนี้ยังไม่มีสิทธิ์ครู กรุณาติดต่อผู้ดูแลระบบ');
      }
      setPassword('');
    } catch {setError('เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง');}
    finally {setBusy(false);}
  }

  const sideRef=useRef<HTMLElement>(null);
  const cardRef=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);

  useLayoutEffect(()=>{
    const side=sideRef.current;
    const card=cardRef.current;
    if(!side||!card)return;
    const fit=()=>{
      const style=getComputedStyle(side);
      const availableHeight=side.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
      setScale(Math.min(1,availableHeight/card.offsetHeight));
    };
    const observer=new ResizeObserver(fit);
    observer.observe(side);
    observer.observe(card);
    fit();
    return ()=>observer.disconnect();
  },[]);

  return <main className="classroom-login">
    <div className="classroom-login-art" role="img" aria-label="ห้องเรียน SQL โทนพาสเทล มีหุ่นยนต์ครูและคอมพิวเตอร์สำหรับฝึกเขียน SQL"/>
    <section ref={sideRef} className="classroom-login-side" aria-labelledby="login-title">
      <div ref={cardRef} className="classroom-login-card" style={{transform:`scale(${scale})`}}>
        <div className="login-brand" aria-label="SQL Classroom">
          <span className="login-brand-sql"><GraduationCap aria-hidden="true"/>SQL</span>
          <span className="login-brand-name">Classroom</span>
        </div>
        <h1 id="login-title">เข้าสู่ห้องเรียน SQL</h1>
        <p className="login-subtitle">ฝึกเขียน SQL ผ่านภารกิจสนุก ๆ</p>
        <div className="login-role-switch" role="group" aria-label="เลือกบทบาท">
          <button type="button" aria-pressed={role==='student'} disabled={busy} onClick={()=>{setRole('student');setError('');setPassword('')}}><GraduationCap aria-hidden="true"/><span>นักเรียน<small>Student</small></span></button>
          <button type="button" aria-pressed={role==='teacher'} disabled={busy} onClick={()=>{setRole('teacher');setError('')}}><UsersRound aria-hidden="true"/><span>ครูผู้สอน<small>Teacher</small></span></button>
        </div>
        <form onSubmit={submit} aria-busy={busy}>
          {role==='teacher'?<>
            <label className="login-name-field"><Mail aria-hidden="true"/><span><span>อีเมล</span><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher@example.ac.th" required disabled={busy}/></span></label>
            <label className="login-name-field login-password"><LockKeyhole aria-hidden="true"/><span><span>รหัสผ่าน</span><input type={visible?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="กรอกรหัสผ่าน" required disabled={busy}/></span><button className="password-toggle" type="button" aria-label={visible?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></label>
            <p className="login-demo-note">สำหรับบัญชีครูที่ได้รับสิทธิ์จากผู้ดูแลระบบ</p>
          </>:<>
            <label className="login-name-field"><UsersRound aria-hidden="true"/><span><span>รหัสห้องเรียน</span><input autoComplete="off" autoCapitalize="characters" spellCheck={false} value={classCode} onChange={e=>setClassCode(e.target.value)} placeholder="เช่น AB3K9Z" required maxLength={12} disabled={busy}/></span></label>
            <label className="login-name-field"><UserRound aria-hidden="true"/><span><span>รหัสนักเรียน</span><input autoComplete="off" inputMode="text" spellCheck={false} value={studentCode} onChange={e=>setStudentCode(e.target.value)} placeholder="เช่น 66001" required maxLength={40} disabled={busy}/></span></label>
            <p className="login-demo-note">ขอรหัสห้องจากครู ส่วนรหัสนักเรียนตั้งเองได้ ใช้รหัสเดิมเพื่อเข้าบัญชีเดิม</p>
          </>}
          {error&&<p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={busy||(role==='teacher'?(!email.trim()||!password):(!classCode.trim()||!studentCode.trim()))}>{busy?'กำลังเข้าสู่ระบบ…':role==='teacher'?'เข้าสู่ระบบ':'เข้าสู่ห้องเรียน'} <ArrowRight size={24} aria-hidden="true"/></button>
        </form>
        <div className="login-card-footer"><span>SQL Classroom</span><i/><span>Learn Today Query Tomorrow</span><Heart size={16} fill="currentColor" aria-hidden="true"/></div>
      </div>
    </section>
  </main>;
}
