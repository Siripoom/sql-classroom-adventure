import {useEffect,useState, type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {Dashboard} from './teacher/Dashboard';
import {supabase} from './supabase';
import {isTeacher} from './teacher-access';

export function TeacherPortal({children}:{children:ReactNode}) {
  const [teacher,setTeacher]=useState<User|null>(null);
  const [checking,setChecking]=useState(Boolean(supabase));
  const [error,setError]=useState('');
  const [leaving,setLeaving]=useState(false);

  useEffect(()=>{
    if(!supabase)return;
    const client=supabase;
    let generation=0;
    let disposed=false;
    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      const current=++generation;
      if(!session){setTeacher(null);setChecking(false);return;}
      if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED'){
        if(event==='INITIAL_SESSION')setChecking(true);
        // Run outside the auth callback to avoid holding the client's session lock.
        setTimeout(async()=>{
          try {
            const {data,error:verificationError}=await client.auth.getUser();
            if(disposed||current!==generation)return;
            setTeacher(!verificationError&&isTeacher(data.user)?data.user:null);
          } catch {
            if(disposed||current!==generation)return;
            setTeacher(null);
          } finally {
            if(!disposed&&current===generation)setChecking(false);
          }
        },0);
      }
    });
    return ()=>{disposed=true;generation++;subscription.unsubscribe()};
  },[]);

  if(checking)return <div className="auth-loading" role="status">กำลังตรวจสอบบัญชีครู…</div>;
  if(!teacher)return children;
  return <Dashboard email={teacher.email??'ครูผู้สอน'} leaving={leaving} logoutError={error} onLogout={async()=>{
    if(!supabase)return;
    setLeaving(true);setError('');
    try {
      const {error}=await supabase.auth.signOut({scope:'local'});
      if(error)throw error;
      setTeacher(null);
    } catch {setError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');}
    finally {setLeaving(false);}
  }}/>;
}
