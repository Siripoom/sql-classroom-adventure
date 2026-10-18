import {useRef} from 'react';
import {tokenizeSql} from './sql-highlight.ts';

// A transparent textarea over a highlighted copy of the same text; the line-number gutter scrolls with it.
export function SqlEditor({value,onChange,onRun}:{value:string;onChange:(sql:string)=>void;onRun:()=>void}){
 const gutter=useRef<HTMLDivElement>(null);
 const layer=useRef<HTMLPreElement>(null);
 const lines=value.split('\n').length;
 function follow(event:React.UIEvent<HTMLTextAreaElement>){
  const {scrollTop,scrollLeft}=event.currentTarget;
  if(gutter.current)gutter.current.scrollTop=scrollTop;
  if(layer.current){layer.current.scrollTop=scrollTop;layer.current.scrollLeft=scrollLeft}
 }
 return <div className="lab-code">
  <div className="lab-gutter" ref={gutter} aria-hidden="true">{Array.from({length:lines},(_,i)=><span key={i}>{i+1}</span>)}</div>
  <div className="lab-text">
   <pre ref={layer} aria-hidden="true">{tokenizeSql(value).map((token,i)=><span key={i} className={`sql-${token.kind}`}>{token.text}</span>)}{'\n'}</pre>
   <textarea aria-label="เขียนคำสั่ง SQL" spellCheck={false} wrap="off" autoCapitalize="off" autoCorrect="off" value={value} onChange={e=>onChange(e.target.value)} onScroll={follow} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();onRun()}}}/>
  </div>
 </div>;
}
