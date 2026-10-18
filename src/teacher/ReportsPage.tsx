import type {ClassGroup,Mission,Result,Student} from './model';
import {
 difficultyLabel,
 followUpList,
 hardestMissions,
 prePostSummary,
 statusDistribution,
 type HardestMission,
 type PrePostSummary,
 type StatusDistributionItem
} from './report-data';
import './reports.css';

export type ReportsPageProps={group:ClassGroup;students:Student[];missions:Mission[];results:Result[];onExport:()=>void};

function EmptyState({message}: {message:string}){
 return <div className="td-empty compact td-rp-empty"><p>{message}</p></div>;
}

function PrePostPanel({summary,hasStudents}: {summary:PrePostSummary;hasStudents:boolean}){
 const hasPairs=summary.pairCount>0;
 return <article className="td-panel td-rp-panel td-rp-prepost-panel">
  <div className="td-rp-panel-heading"><div><h3>ผลก่อน-หลังเรียน (Pre/Post-test)</h3><p>เปรียบเทียบคะแนนของนักเรียนที่มีข้อมูลทั้งสองครั้ง</p></div><span className="td-rp-panel-mark">↗</span></div>
  {!hasStudents?<EmptyState message="ยังไม่มีนักเรียนในห้องเรียนนี้"/>:!hasPairs?<EmptyState message="ยังไม่มีข้อมูล Pre-test และ Post-test ครบคู่"/>:<>
   <div className="td-rp-prepost-metrics">
    <div><small>ก่อนเรียนเฉลี่ย</small><strong>{summary.averagePre}</strong><span>คะแนน</span></div>
    <div><small>หลังเรียนเฉลี่ย</small><strong>{summary.averagePost}</strong><span>คะแนน</span></div>
    <div><small>คะแนนเพิ่มเฉลี่ย</small><strong className="td-rp-gain">{summary.averageGain!==null&&summary.averageGain>=0?'+':''}{summary.averageGain}</strong><span>คะแนน</span></div>
    <div><small>นักเรียนที่ดีขึ้น</small><strong>{summary.improved}</strong><span>คน</span></div>
   </div>
   <div className="td-rp-prepost-chart" role="img" aria-label={`คะแนนเฉลี่ยก่อนเรียน ${summary.averagePre} คะแนน หลังเรียน ${summary.averagePost} คะแนน เพิ่มขึ้นเฉลี่ย ${summary.averageGain} คะแนน`}>
    <div className="td-rp-axis-label"><span>100</span><span>50</span><span>0</span></div>
    <div className="td-rp-paired-bars">
     <div className="td-rp-bar-group"><div className="td-rp-bar-pair"><div className="td-rp-paired-bar td-rp-pre-bar" style={{height:`${summary.averagePre}%`}} title={`ก่อนเรียน ${summary.averagePre} คะแนน`}/><div className="td-rp-paired-bar td-rp-post-bar" style={{height:`${summary.averagePost}%`}} title={`หลังเรียน ${summary.averagePost} คะแนน`}/></div><span>คะแนนเฉลี่ย</span></div>
    </div>
    <div className="td-rp-chart-legend"><span><i className="td-rp-legend-pre"/>ก่อนเรียน</span><span><i className="td-rp-legend-post"/>หลังเรียน</span></div>
   </div>
   <div className="td-rp-subheading"><b>นักเรียนที่พัฒนามากที่สุด</b><small>แสดงสูงสุด 5 คน</small></div>
   <div className="td-rp-improver-list" aria-label="รายชื่อนักเรียนที่พัฒนามากที่สุด">
    {summary.topImprovers.map(row=><div className="td-rp-improver-row" key={row.student.id}><span className="td-rp-rank">{summary.topImprovers.indexOf(row)+1}</span><strong>{row.student.name}</strong><span>{row.pre} → {row.post}</span><span className="td-badge mint">{row.gain>=0?'+':''}{row.gain}</span></div>)}
   </div>
  </>}
 </article>;
}

function DistributionPanel({items,hasStudents,hasResults}: {items:StatusDistributionItem[];hasStudents:boolean;hasResults:boolean}){
 return <article className="td-panel td-rp-panel">
  <div className="td-rp-panel-heading"><div><h3>การกระจายระดับผลการเรียน</h3><p>สถานะจากคะแนนภารกิจของนักเรียนทั้งห้อง</p></div><span className="td-rp-panel-mark">◒</span></div>
  {!hasStudents?<EmptyState message="ยังไม่มีนักเรียนในห้องเรียนนี้"/>:!hasResults?<EmptyState message="ยังไม่มีผลการทำภารกิจให้แสดง"/>:<div className="td-rp-distribution" role="img" aria-label={items.map(item=>`${item.status} ${item.count} คน ${item.percent}%`).join(', ')}>
   {items.map(item=><div className="td-rp-distribution-row" key={item.status}><div className="td-rp-distribution-label"><span className={`td-badge ${item.tone}`}>{item.status}</span><b>{item.count} คน</b><small>{item.percent}%</small></div><div className="td-rp-distribution-track"><span className={`td-rp-distribution-fill td-rp-fill-${item.tone}`} style={{width:`${item.percent}%`}}/></div></div>)}
  </div>}
 </article>;
}

function FollowUpPanel({students,hasStudents}: {students:ReturnType<typeof followUpList>;hasStudents:boolean}){
 return <article className="td-panel td-rp-panel">
  <div className="td-rp-panel-heading"><div><h3>นักเรียนที่ควรติดตาม</h3><p>ต้องการความช่วยเหลือหรือยังไม่มีผลการเรียน</p></div><span className="td-rp-panel-mark">!</span></div>
  {!hasStudents?<EmptyState message="ยังไม่มีนักเรียนในห้องเรียนนี้"/>:!students.items.length?<EmptyState message="ยังไม่มีนักเรียนที่ต้องติดตาม"/>:<>
   <div className="td-rp-follow-list">
    {students.items.map(row=><div className="td-rp-follow-row" key={row.student.id}><div className="td-rp-follow-name"><span className={`td-rp-follow-avatar td-rp-avatar-${row.tone}`}>{row.student.name.slice(0,1)}</span><div><strong>{row.student.name}</strong><span className={`td-badge ${row.tone}`}>{row.status}</span></div></div><div className="td-rp-follow-progress"><div className="td-rp-progress-line"><span style={{width:`${row.progress}%`}}/></div><small>{row.progress}% · {row.completed} ภารกิจ</small></div><strong className="td-rp-follow-average">{row.average===null?'—':row.average}<small>คะแนน</small></strong></div>)}
   </div>
   {students.omitted>0&&<p className="td-rp-more-note">แสดง 8 คนแรก ยังมีอีก {students.omitted} คนที่ควรติดตาม</p>}
  </>}
 </article>;
}

function HardestMissionsPanel({missions,hasStudents}: {missions:HardestMission[];hasStudents:boolean}){
 return <article className="td-panel td-rp-panel">
  <div className="td-rp-panel-heading"><div><h3>ภารกิจที่ทำสำเร็จน้อยที่สุด</h3><p>เรียงตามอัตราการทำสำเร็จของนักเรียนในห้อง</p></div><span className="td-rp-panel-mark">☆</span></div>
  {!hasStudents?<EmptyState message="ยังไม่มีนักเรียนในห้องเรียนนี้"/>:!missions.length?<EmptyState message="ยังไม่มีภารกิจในห้องเรียนนี้"/>:<div className="td-rp-mission-list" aria-label="ภารกิจที่ทำสำเร็จน้อยที่สุด">
   {missions.map(row=><div className="td-rp-mission-row" key={row.mission.id}><div className="td-rp-mission-topic">{row.mission.topic}</div><div className="td-rp-mission-name"><strong>{row.mission.title}</strong><span className={`td-badge ${row.tone}`}>{difficultyLabel(row.mission.difficulty)}</span></div><div className="td-rp-mission-rate"><div className="td-rp-progress-line"><span style={{width:`${row.rate}%`}}/></div><small>{row.rate}%</small></div><b className="td-rp-mission-count">{row.completed} / {row.total} คน</b></div>)}
  </div>}
 </article>;
}

export function ReportsPage({group,students,missions,results,onExport}:ReportsPageProps){
 const prePost=prePostSummary(students);
 const distribution=statusDistribution(students,missions,results);
 const followUp=followUpList(students,missions,results);
 const hardest=hardestMissions(missions,students,results);
 return <section className="td-rp-reports" aria-labelledby="td-rp-heading">
  <div className="td-section-heading td-rp-header">
   <div><h2 id="td-rp-heading">สรุปผลการเรียนรู้</h2><p>คะแนนและเวลาที่ครูบันทึก • ส่งออก CSV เปิดใน Excel ได้</p><small className="td-rp-group-label">{group.name} · {group.subject}</small></div>
   <button type="button" className="td-rp-export" onClick={onExport} aria-label="ส่งออกรายงาน CSV">⇩ <span>ส่งออกรายงาน CSV</span></button>
  </div>
  <div className="td-rp-grid">
   <PrePostPanel summary={prePost} hasStudents={students.length>0}/>
   <DistributionPanel items={distribution} hasStudents={students.length>0} hasResults={results.length>0}/>
   <FollowUpPanel students={followUp} hasStudents={students.length>0}/>
   <HardestMissionsPanel missions={hardest} hasStudents={students.length>0}/>
  </div>
 </section>;
}
