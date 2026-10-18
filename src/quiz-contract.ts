export type QuizKind='pre'|'post';
export const quizKinds:readonly QuizKind[]=['pre','post'];
export const quizLabels:Record<QuizKind,string>={pre:'ก่อนเรียน',post:'หลังเรียน'};
export const optionLabels=['ก','ข','ค','ง'] as const;
export type OptionIndex=0|1|2|3;
export type Grade={correct:number;total:number;score:number};
