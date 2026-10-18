import type {OptionIndex,QuizKind} from '../quiz-contract.ts';

export type StudentQuizQuestion={id:string;prompt:string;options:readonly [string,string,string,string]};
export type StudentAnswers=Partial<Record<string,OptionIndex>>;
export type StudentQuizResult={correct:number;total:number;score:number|null;answered:number;unanswered:number;submittedAt:string};
export type StudentQuiz=
 |{kind:QuizKind;status:'unavailable';revision:null;questions:readonly [];result:null}
 |{kind:QuizKind;status:'open';revision:string;questions:readonly StudentQuizQuestion[];result:null}
 |{kind:QuizKind;status:'submitted';revision:string|null;questions:readonly [];result:StudentQuizResult};

export class StudentQuizError extends Error {}
export class StudentQuizRevisionError extends StudentQuizError {
 readonly quiz:StudentQuiz;
 constructor(quiz:StudentQuiz){super('ข้อสอบมีการเปลี่ยนแปลง กรุณาโหลดข้อสอบใหม่');this.quiz=quiz}
}

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string';
const integer=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0;
function kind(value:unknown):QuizKind|null{return value==='pre'||value==='post'?value:null}
function options(value:unknown):readonly [string,string,string,string]|null{
 if(!Array.isArray(value)||value.length!==4||!value.every(text))return null;
 const [first,second,third,fourth]=value;
 return [first,second,third,fourth];
}
function question(value:unknown):StudentQuizQuestion|null{
 if(!record(value)||!text(value.id)||!text(value.prompt))return null;
 const choices=options(value.options);
 return choices?{id:value.id,prompt:value.prompt,options:choices}:null;
}
function result(value:unknown):StudentQuizResult|null{
 if(!record(value)||!integer(value.correct)||!integer(value.total)||!integer(value.answered)||!integer(value.unanswered)||!text(value.submittedAt))return null;
 if(value.score!==null&&(typeof value.score!=='number'||!Number.isFinite(value.score)))return null;
 return {correct:value.correct,total:value.total,score:value.score,answered:value.answered,unanswered:value.unanswered,submittedAt:value.submittedAt};
}

export function parseStudentQuiz(raw:unknown):StudentQuiz{
 if(!record(raw))throw new StudentQuizError('ข้อมูลแบบทดสอบไม่ถูกต้อง');
 const quizKind=kind(raw.kind);
 if(!quizKind||!text(raw.status))throw new StudentQuizError('ข้อมูลแบบทดสอบไม่ถูกต้อง');
 if(raw.status==='unavailable')return {kind:quizKind,status:'unavailable',revision:null,questions:[],result:null};
 if(raw.status==='open'&&text(raw.revision)&&Array.isArray(raw.questions)){
  const questions=raw.questions.map(question);
  if(questions.some(item=>item===null))throw new StudentQuizError('ข้อมูลคำถามไม่ถูกต้อง');
  return {kind:quizKind,status:'open',revision:raw.revision,questions:questions.filter((item):item is StudentQuizQuestion=>item!==null),result:null};
 }
 if(raw.status==='submitted'){
  const submitted=result(raw.result);
  if((raw.revision!==null&&!text(raw.revision))||!submitted)throw new StudentQuizError('ข้อมูลผลแบบทดสอบไม่ถูกต้อง');
  return {kind:quizKind,status:'submitted',revision:raw.revision===null?null:raw.revision,questions:[],result:submitted};
 }
 if(raw.status==='revision_changed')throw new StudentQuizRevisionError(parseStudentQuiz({kind:quizKind,status:'open',revision:raw.revision,questions:raw.questions}));
 if(raw.status==='invalid_answers'&&text(raw.message))throw new StudentQuizError(raw.message);
 throw new StudentQuizError('ข้อมูลแบบทดสอบไม่ถูกต้อง');
}
