export function advanceAnimationTime(elapsed:number,previous:number|null,now:number,hidden:boolean,duration:number){
 const current=Number.isFinite(elapsed)?Math.max(0,Math.min(duration,elapsed)):0;
 if(hidden||previous===null||!Number.isFinite(previous)||!Number.isFinite(now))return current;
 return Math.min(duration,current+Math.max(0,Math.min((now-previous)/1000,0.1)));
}
