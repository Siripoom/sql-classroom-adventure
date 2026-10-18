import {useEffect,useState,type ReactNode} from 'react';
import {CheckCircle2,ClipboardCheck,LoaderCircle,Lock,Send,TriangleAlert} from 'lucide-react';
import {optionLabels,quizLabels,type OptionIndex, type QuizKind} from '../quiz-contract.ts';
import {loadStudentQuiz,submitStudentQuiz,type StudentAnswers,type StudentQuiz,type StudentQuizQuestion,type StudentQuizResult} from './student-quiz.ts';
import type {StudentCodes} from './student-access.ts';

type OpenQuiz=Extract<StudentQuiz,{status:'open'}>;
type QuizPageState=
 |{status:'loading'}
 |{status:'ready';quiz:OpenQuiz;answers:StudentAnswers;error:string}
 |{status:'confirming';quiz:OpenQuiz;answers:StudentAnswers}
 |{status:'submitting';quiz:OpenQuiz;answers:StudentAnswers}
 |{status:'result';result:StudentQuizResult}
 |{status:'error';message:string};

type Props={codes:StudentCodes;quiz:QuizKind;onBack:()=>void;onSubmitted:()=>void};

function answerCount(questions:readonly StudentQuizQuestion[],answers:StudentAnswers){return questions.filter(question=>answers[question.id]!==undefined).length}
function optionIndex(value:number):OptionIndex|null{return value===0||value===1||value===2||value===3?value:null}
function scoreText(result:StudentQuizResult){return result.score===null?'ไม่มีคะแนน':`${result.score}%`}

export function StudentQuizPage({codes,quiz,onBack,onSubmitted}:Props){
 const [state,setState]=useState<QuizPageState>({status:'loading'});
 const load=()=>{setState({status:'loading'});loadStudentQuiz(codes,quiz).then(found=>{if(found.status==='submitted')setState({status:'result',result:found.result});else if(found.status==='open')setState({status:'ready',quiz:found,answers:{},error:''});else setState({status:'error',message:'แบบทดสอบนี้ยังไม่เปิดสำหรับห้องเรียนของคุณ'})}).catch(error=>setState({status:'error',message:error instanceof Error?error.message:'โหลดแบบทดสอบไม่สำเร็จ'}))};
 useEffect(()=>{load()},[codes.classCode,codes.studentCode,quiz]);
 const updateAnswer=(questionId:string,value:string)=>{if(state.status!=='ready'&&state.status!=='confirming')return;const answer=optionIndex(Number(value));if(answer===null)return;const answers={...state.answers,[questionId]:answer};setState({status:'ready',quiz:state.quiz,answers,error:''})};
 const submit=async(current:Extract<QuizPageState,{status:'ready'|'confirming'}>)=>{setState({status:'submitting',quiz:current.quiz,answers:current.answers});try{const result=await submitStudentQuiz(codes,quiz,current.quiz.revision,current.answers);setState({status:'result',result});onSubmitted()}catch(error){setState({status:'ready',quiz:current.quiz,answers:current.answers,error:error instanceof Error?error.message:'ส่งคำตอบไม่สำเร็จ'})}};
 const title=`แบบทดสอบ${quizLabels[quiz]}`;
 if(state.status==='loading')return <QuizShell title={title} onBack={onBack}><div className="student-quiz-loading" role="status"><LoaderCircle className="student-spin"/>กำลังเตรียมแบบทดสอบ…</div></QuizShell>;
 if(state.status==='error')return <QuizShell title={title} onBack={onBack}><div className="student-quiz-message is-error" role="alert"><TriangleAlert size={32}/><h2>ยังเปิดแบบทดสอบไม่ได้</h2><p>{state.message}</p><div><button className="secondary" onClick={onBack}>กลับห้องเรียน</button><button onClick={load}>ลองใหม่</button></div></div></QuizShell>;
 if(state.status==='result')return <QuizShell title={title} onBack={onBack}><QuizResult result={state.result} onBack={onBack}/></QuizShell>;
 const count=answerCount(state.quiz.questions,state.answers),complete=count===state.quiz.questions.length;
 return <QuizShell title={title} onBack={onBack}><section className="student-quiz-card"><div className="student-quiz-intro"><span className="student-quiz-icon"><ClipboardCheck size={28}/></span><div><span className="pill">{quiz==='pre'?'ก่อนเริ่มบทเรียน':'หลังจบบทเรียน'}</span><h2>ตอบคำถามให้เต็มที่</h2><p>แบบทดสอบนี้ทำได้ครั้งเดียว เมื่อส่งคำตอบแล้วจะกลับมาแก้ไขไม่ได้</p></div><strong>{count}/{state.quiz.questions.length}</strong></div><form onSubmit={event=>{event.preventDefault();if(state.status==='ready')complete?void submit(state):setState({status:'confirming',quiz:state.quiz,answers:state.answers})}}>{state.quiz.questions.map((question,index)=><fieldset className="student-quiz-question" key={question.id}><legend><span>ข้อ {index+1}</span>{question.prompt}</legend><div className="student-quiz-options">{question.options.map((option,optionIndex)=><label className={state.answers[question.id]===optionIndex?'is-selected':''} key={optionLabels[optionIndex]}><input type="radio" name={question.id} value={optionIndex} checked={state.answers[question.id]===optionIndex} onChange={event=>updateAnswer(question.id,event.target.value)}/><b>{optionLabels[optionIndex]}</b><span>{option}</span></label>)}</div></fieldset>)}{state.status==='ready'&&state.error&&<p className="student-quiz-error" role="alert">{state.error}</p>}{state.status==='confirming'&&<div className="student-quiz-confirm" role="alert"><TriangleAlert size={22}/><div><b>ยังตอบไม่ครบ {state.quiz.questions.length-count} ข้อ</b><span>ข้อที่เว้นไว้จะนับเป็นคำตอบผิด คุณต้องการส่งตอนนี้หรือไม่</span></div><button type="button" className="secondary" onClick={()=>setState({status:'ready',quiz:state.quiz,answers:state.answers,error:''})}>กลับไปตอบ</button><button type="button" onClick={()=>void submit(state)}>ส่งคำตอบ</button></div>}{state.status==='submitting'?<button className="student-quiz-submit" disabled><LoaderCircle className="student-spin"/>กำลังบันทึกคำตอบ…</button>:state.status==='confirming'?null:<button className="student-quiz-submit" disabled={!state.quiz.questions.length}><Send size={18}/>ส่งคำตอบ{complete?'':'และจบแบบทดสอบ'}</button>}</form></section></QuizShell>;
}

function QuizShell({title,onBack,children}:{title:string;onBack:()=>void;children:React.ReactNode}){return <><button className="back student-quiz-back" onClick={onBack}>← กลับห้องเรียน</button><div className="student-quiz-page"><header className="student-quiz-header"><div><span className="pill">SQL CLASSROOM</span><h1>{title}</h1><p>อ่านโจทย์ให้ละเอียด แล้วเลือกคำตอบที่คิดว่าเหมาะที่สุด</p></div><Lock size={20} aria-label="ทำได้ครั้งเดียว"/></header>{children}</div></>}
function QuizResult({result,onBack}:{result:StudentQuizResult;onBack:()=>void}){return <section className="student-quiz-result" role="status"><span className="student-result-icon"><CheckCircle2 size={44}/></span><p className="pill">ส่งคำตอบเรียบร้อยแล้ว</p><h2>เก่งมากที่ลงมือทำ</h2><strong>{scoreText(result)}</strong><p>ตอบถูก {result.correct} จาก {result.total} ข้อ</p>{result.unanswered>0&&<small>เว้นไว้ {result.unanswered} ข้อ</small>}<button onClick={onBack}>กลับห้องเรียน</button></section>}
