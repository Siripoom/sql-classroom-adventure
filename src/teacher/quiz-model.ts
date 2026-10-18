import type {Student} from './model.ts';
import {optionLabels,quizKinds,quizLabels,type Grade,type OptionIndex,type QuizKind} from '../quiz-contract.ts';

export {optionLabels,quizKinds,quizLabels};
export type {Grade,QuizKind};
export type Question={id:string;class_id:string;kind:QuizKind;prompt:string;options:string[];correct_option:OptionIndex};
export type Attempt={id:string;class_id:string;student_id:string;kind:QuizKind;answers:Record<string,OptionIndex>};
export type QuizRow={student:Student;pre:Grade|null;post:Grade|null;gain:number|null};
export type QuestionDraft={prompt:string;options:string[];correct_option:number};

function roundOne(value:number):number{
 return Math.round((value+Number.EPSILON)*10)/10;
}

function textValue(value:FormDataEntryValue|null):string{
 return value===null?'':typeof value==='string'?value:String(value);
}

function optionNumber(value:string):number|null{
 const number=Number(value);
 return value!==''&&Number.isInteger(number)&&number>=0&&number<=3?number:null;
}

export function gradeAttempt(questions:Question[],attempt:Attempt|undefined):Grade|null{
 if(!attempt||!questions.length)return null;
 const correct=questions.filter(question=>attempt.answers[question.id]===question.correct_option).length;
 return {correct,total:questions.length,score:roundOne(correct/questions.length*100)};
}

export function quizRows(students:Student[],questions:Question[],attempts:Attempt[]):QuizRow[]{
 return students.map(student=>{
  const grades=quizKinds.map(kind=>gradeAttempt(
   questions.filter(question=>question.class_id===student.class_id&&question.kind===kind),
   attempts.find(attempt=>attempt.student_id===student.id&&attempt.kind===kind)
  ));
  const [pre,post]=grades;
  return {student,pre,post,gain:pre&&post?roundOne(post.score-pre.score):null};
 });
}

export function withQuizScores(students:Student[],questions:Question[],attempts:Attempt[]):Student[]{
 return quizRows(students,questions,attempts).map(({student,pre,post})=>({
  ...student,
  pre_test:pre?pre.score:student.pre_test,
  post_test:post?post.score:student.post_test
 }));
}

export function readQuestionForm(data:FormData):QuestionDraft{
 const prompt=textValue(data.get('prompt')).trim();
 const options=[0,1,2,3].map(index=>textValue(data.get(`option_${index}`)).trim());
 const correctValue=textValue(data.get('correct_option')).trim();
 const correct_option=optionNumber(correctValue);
 if(!prompt)throw new Error('กรุณากรอกโจทย์');
 if(options.some(option=>!option))throw new Error('กรุณากรอกตัวเลือกให้ครบทั้ง 4 ข้อ');
 if(correct_option===null)throw new Error('กรุณาเลือกข้อที่ถูกต้อง');
 if(prompt.length>1000)throw new Error('โจทย์ยาวเกิน 1000 ตัวอักษร');
 if(options.some(option=>option.length>300))throw new Error('ตัวเลือกยาวเกิน 300 ตัวอักษร');
 return {prompt,options,correct_option};
}

export function readQuestionBatch(data:FormData):QuestionDraft[]{
 const prefixes=data.getAll('question_prefix');
 if(!prefixes.length)throw new Error('กรุณาเพิ่มข้อสอบอย่างน้อย 1 ข้อ');
 return prefixes.map((prefix,index)=>{
  const question=new FormData();
  for(const key of ['prompt','option_0','option_1','option_2','option_3','correct_option']){
   question.set(key,textValue(data.get(`${prefix}${key}`)));
  }
  try{return readQuestionForm(question)}catch(error){throw new Error(`ข้อที่ ${index+1}: ${error instanceof Error?error.message:'ข้อมูลไม่ถูกต้อง'}`)}
 });
}

export function readAnswers(data:FormData,questions:Question[]):Record<string,number>{
 const answers:Record<string,number>={};
 questions.forEach(question=>{
  const value=textValue(data.get(`q_${question.id}`)).trim();
  if(!value)return;
  const answer=optionNumber(value);
  if(answer===null)throw new Error('คำตอบไม่ถูกต้อง');
  answers[question.id]=answer;
 });
 return answers;
}
