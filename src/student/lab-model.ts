export type Outcome=
 |{tone:'idle'}
 |{tone:'error';text:string}
 |{tone:'wrong'}
 |{tone:'right';firstTime:boolean};

export const IDLE:Outcome={tone:'idle'};

export type Piece={id:number;text:string};
export type Phase='arrange'|'write';
export type Verdict='incomplete'|'wrong'|'right';

const wordsOf=(answer:string)=>answer.trim().split(/\s+/);

// The pool for phase 1: every word of the answer once, in a fixed order that differs per lesson but never equals the answer.
export function arrangePieces(answer:string,seed:number):Piece[]{
 const pieces=wordsOf(answer).map((text,id)=>({id,text}));
 let state=(seed*2654435761+12345)>>>0;
 const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32};
 for(let i=pieces.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[pieces[i],pieces[j]]=[pieces[j],pieces[i]]}
 if(pieces.length>1&&pieces.every((p,i)=>p.text===wordsOf(answer)[i]))pieces.push(pieces.shift()!);
 return pieces;
}

export function judgeArrangement(placed:readonly string[],answer:string):Verdict{
 const want=wordsOf(answer);
 if(placed.length<want.length)return 'incomplete';
 return placed.length===want.length&&placed.every((w,i)=>w===want[i])?'right':'wrong';
}
