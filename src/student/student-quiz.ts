import {supabase} from '../supabase.ts';
import {normalizeClassCode,normalizeStudentCode,type StudentCodes} from './student-access.ts';
import type {QuizKind} from '../quiz-contract.ts';
import {parseStudentQuiz,StudentQuizError,StudentQuizRevisionError,type StudentAnswers,type StudentQuiz,type StudentQuizQuestion,type StudentQuizResult} from './student-quiz-model.ts';
export {parseStudentQuiz,StudentQuizError,StudentQuizRevisionError};
export type {StudentAnswers,StudentQuiz,StudentQuizQuestion,StudentQuizResult};

export async function loadStudentQuiz(codes:StudentCodes,quiz:QuizKind):Promise<StudentQuiz>{
 if(!supabase)throw new StudentQuizError('Supabase is not configured');
 const {data,error}=await supabase.rpc('student_quiz',{p_class_code:normalizeClassCode(codes.classCode),p_student_code:normalizeStudentCode(codes.studentCode),p_kind:quiz});
 if(error)throw new StudentQuizError(error.message);
 if(data===null)throw new StudentQuizError('ไม่พบข้อมูลนักเรียน');
 return parseStudentQuiz(data);
}

export async function submitStudentQuiz(codes:StudentCodes,quiz:QuizKind,revision:string,answers:StudentAnswers):Promise<StudentQuizResult>{
 if(!supabase)throw new StudentQuizError('Supabase is not configured');
 const {data,error}=await supabase.rpc('student_submit_quiz',{p_class_code:normalizeClassCode(codes.classCode),p_student_code:normalizeStudentCode(codes.studentCode),p_kind:quiz,p_revision:revision,p_answers:answers});
 if(error)throw new StudentQuizError(error.message);
 if(data===null)throw new StudentQuizError('ไม่พบข้อมูลนักเรียน');
 const parsed=parseStudentQuiz(data);
 if(parsed.status==='submitted')return parsed.result;
 throw new StudentQuizError('ส่งคำตอบไม่สำเร็จ');
}
