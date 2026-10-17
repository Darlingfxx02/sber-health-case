// Presentation rules for the fictional activity demo, not clinical assessment.
export function mascotCue(day,latestDayId){
  const recorded=day?.progress?.filter(Number.isFinite)||[];
  if(recorded.length===3&&recorded.every(value=>value>=100))return {emotion:'happy',reason:'goals-complete'};
  if(!day||day.id!==latestDayId)return {emotion:'thoughtful',reason:'history'};
  // Zero in this dataset means "Нет записей". Nutrition is not a prompt to eat more.
  const candidates=['movement','distance'].map((id,index)=>({id,progress:day.progress[index]}))
    .filter(item=>Number.isFinite(item.progress)&&item.progress>0&&item.progress<50).sort((a,b)=>a.progress-b.progress);
  return candidates.length?{emotion:'encouraging',reason:'activity-progress',target:candidates[0].id}:{emotion:'neutral',reason:'idle'};
}
export function gazeAt(from,to){
  const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
  const length=Math.hypot(dx,dy)||1;
  return {x:Math.round(dx/length*10),y:Math.round(dy/length*7)};
}
export const IDLE_POSES=[
  {emotion:'neutral',x:0,y:0,reason:'rest',duration:3400},
  {emotion:'curious',x:-6,y:-2,reason:'look-around',duration:1800},
  {emotion:'neutral',x:4,y:1,reason:'look-around',duration:2400},
  {emotion:'thoughtful',x:5,y:-3,reason:'ponder',duration:1700},
  {emotion:'neutral',x:0,y:0,reason:'rest',duration:4200},
];
