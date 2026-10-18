import {Component, useEffect, useMemo, useState, type ReactNode} from 'react';
import {Canvas, useThree} from '@react-three/fiber';
import {CanvasTexture, SRGBColorSpace} from 'three';
import {Pause, Play, RotateCcw} from 'lucide-react';
import './select-animation.css';
import {advanceAnimationTime} from './animation-clock';

const duration=24;
const steps=[
 ['เริ่มจากตาราง students','ตารางเก็บข้อมูลเป็นแถวและคอลัมน์ แต่ละแถวคือนักเรียนหนึ่งคน'],
 ['FROM students — อ่านจากตารางไหน','FROM ระบุตารางต้นทาง ในตัวอย่างนี้คือ students'],
 ['SELECT * — เลือกทุกคอลัมน์','เครื่องหมาย * หมายถึงทุกคอลัมน์: id, name, score และ club_id'],
 ['ได้ผลลัพธ์ครบทุกแถว','คำสั่งนี้ไม่มี WHERE จึงแสดงนักเรียนทั้ง 5 คน โดยข้อมูลต้นทางยังเหมือนเดิม'],
];
const data=[['id','name','score','club_id'],['1','มะลิ','92','1'],['2','ภูมิ','75','2'],['3','ต้น','88','1'],['4','ฟ้า','64','2'],['5','นุ่น','96','NULL']];

function TableCard({x,y,selected,opacity=1}:{x:number;y:number;selected:boolean;opacity?:number}){
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=600;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,960,600);
  data.forEach((row,r)=>row.forEach((cell,c)=>{
   ctx.fillStyle=r===0?(selected?'#0f766e':'#334155'):r%2?'#f0fdfa':'#ffffff';
   ctx.fillRect(c*240,r*100,240,100);
   ctx.fillStyle=r===0?'#ffffff':'#16334a';ctx.font=`${r===0?'bold ':''}36px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cell,c*240+120,r*100+50);
  }));
  const result=new CanvasTexture(canvas);result.colorSpace=SRGBColorSpace;return result;
 },[selected]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[x,y,opacity<1?0.1:0]}><planeGeometry args={[5.6,3.5]}/><meshBasicMaterial map={texture} transparent opacity={opacity}/></mesh>;
}

class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}

function StaticTables(){return <div className="select-film-fallback"><p>ตาราง students → ผลลัพธ์ (ข้อมูลครบทั้ง 5 แถว)</p><table><thead><tr>{data[0].map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{data.slice(1).map(row=><tr key={row[0]}>{row.map((c,i)=><td key={i}>{c}</td>)}</tr>)}</tbody></table></div>}

export function SelectAnimation(){
 const [time,setTime]=useState(0);
 const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [contextLost,setContextLost]=useState(false);
 const stage=Math.min(3,Math.floor(time/6));
 useEffect(()=>{
  if(!playing)return;
  let frame=0;let previous:number|null=null;
  const tick=(now:number)=>{
   const last=previous;const hidden=document.hidden;previous=now;
   setTime(t=>advanceAnimationTime(t,last,now,hidden,duration));frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing]);
 useEffect(()=>{if(time>=duration)setPlaying(false)},[time]);
 const replay=()=>{setTime(0);setPlaying(true)};
 const travel=Math.min(1,Math.max(0,(time-18)/3));
 const eased=travel*travel*(3-2*travel);
 return <section className="select-film" aria-label="วิดีโอแอนิเมชันอธิบาย SELECT">
  <div className="select-film-heading"><div><span>ดูให้เข้าใจ ก่อนลงมือทำ · 24 วินาที</span><h2>SELECT ดึงข้อมูลออกมาอย่างไร?</h2></div><span className="select-film-tag">3D • WebGL</span></div>
  <div className="select-film-query" aria-label="SELECT * FROM students;"><strong className={stage===2?'active':''}>SELECT *</strong>{' '}<strong className={stage===1?'active':''}>FROM students</strong>;</div>
  <div className="select-film-labels"><span>ต้นทาง · students</span><span>{stage===3?'ผลลัพธ์ · 5 แถว':'พื้นที่แสดงผลลัพธ์'}</span></div>
  <div className="select-film-scene" role="img" aria-label={`${steps[stage][0]}: ${steps[stage][1]}`}>
   {contextLost?<StaticTables/>:<SceneBoundary fallback={<StaticTables/>}><Canvas orthographic camera={{position:[0,0,10],zoom:55}} frameloop="demand" dpr={[1,2]} fallback={<StaticTables/>} onCreated={({gl,camera,size})=>{
    camera.zoom=size.width/13;camera.updateProjectionMatrix();
    gl.domElement.addEventListener('webglcontextlost',()=>setContextLost(true),{once:true});
   }} resize={{debounce:0}}>
    <SceneContent time={time} eased={eased}/>
   </Canvas></SceneBoundary>}
  </div>
  <div className="select-film-caption" aria-live="polite"><b>{stage+1}. {steps[stage][0]}</b><p>{steps[stage][1]}</p></div>
  <div className="select-film-controls"><button type="button" onClick={()=>time>=duration?replay():setPlaying(p=>!p)}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'หยุดชั่วคราว':time>=duration?'เล่นอีกครั้ง':'เล่นต่อ'}</button><button type="button" onClick={replay}><RotateCcw size={17}/>ดูซ้ำตั้งแต่ต้น</button><span>{Math.floor(time)} / {duration} วินาที</span></div>
  <progress max={duration} value={time} aria-label="ความคืบหน้าของแอนิเมชัน"/>
 </section>;
}

function SceneContent({time,eased}:{time:number;eased:number}){
 const {camera,size}=useThree();
 useEffect(()=>{camera.zoom=size.width/13;camera.updateProjectionMatrix()},[camera,size.width]);
 return <><TableCard x={-3.2} y={0} selected={time>=6}/>{time>=18&&<TableCard x={-3.2+6.4*eased} y={Math.sin(eased*Math.PI)*0.3} selected opacity={0.3+0.7*eased}/>}</>;
}
