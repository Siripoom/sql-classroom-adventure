import {supabase} from '../supabase.ts';
import {normalizeClassCode, normalizeStudentCode, parseNameOutcome, parseStudentClassroom, type NameOutcome, type StudentClassroom, type StudentCodes} from './student-access.ts';

export class StudentOfflineError extends Error {}

// Resolves to null when the code pair is unknown; throws when the system cannot be reached.
export async function loadStudentClassroom(codes:StudentCodes):Promise<StudentClassroom|null>{
 if(!supabase)throw new StudentOfflineError('Supabase is not configured');
 const {data,error}=await supabase.rpc('student_classroom',{p_class_code:normalizeClassCode(codes.classCode),p_student_code:normalizeStudentCode(codes.studentCode)});
 if(error)throw new StudentOfflineError(error.message);
 return parseStudentClassroom(data);
}

// Resolves to null when the code pair is unknown. The server keeps the first name, so a replay is harmless.
export async function setStudentName(codes:StudentCodes,name:string):Promise<NameOutcome|null>{
 if(!supabase)throw new StudentOfflineError('Supabase is not configured');
 const {data,error}=await supabase.rpc('student_set_name',{p_class_code:normalizeClassCode(codes.classCode),p_student_code:normalizeStudentCode(codes.studentCode),p_name:name});
 if(error)throw new StudentOfflineError(error.message);
 return parseNameOutcome(data);
}
