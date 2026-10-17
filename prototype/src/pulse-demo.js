// Fictional prototype data. Stress/recovery estimates are authored separately,
// never inferred from pulse, interpolated measurements or clinical thresholds.
const readings=[
  ['00:00',60,'sleep'],['01:00',58,'sleep'],['02:00',55,'sleep'],
  ['03:00',57,'sleep'],['04:00',54,'sleep'],['05:00',58,'sleep'],
  ['06:00',66,'sleep'],['07:00',61,'recovery'],
  ['07:30',74,'activity'],['07:45',88,'activity'],['08:00',105,'activity'],
  ['08:15',94,'activity'],['08:30',78,'activity'],
  ['09:00',70,'stress'],['09:20',67,'stress'],['09:35',64,'recovery']
];
export const PULSE_DEMO_DAY={
  labels:readings.map(row=>row[0]),values:readings.map(row=>row[1]),
  contexts:readings.map(row=>row[2])
};
const state=(low,high,minutes,segments=[])=>({low,high,minutes,segments});
// Authored UI positions for a future tracker's personal-guidance estimate.
// These are not clinical thresholds and are not calculated from pulse or minutes.
const demoGuideScores={stress:[38,61,68,31,49,76,72],recovery:[49,63,82,35,54,74,68]};
export const PULSE_DEMO_DAYS=[
  {date:'2026-10-09',sleep:state(54,70,412),activity:state(86,132,35),stress:state(72,101,105),recovery:state(60,68,45)},
  {date:'2026-10-10',sleep:state(52,67,458),activity:state(88,144,50),stress:state(74,105,70),recovery:state(58,65,60)},
  {date:'2026-10-11',sleep:state(55,71,401),activity:state(null,null,0),stress:state(70,96,65),recovery:state(59,67,80)},
  {date:'2026-10-12',sleep:state(51,65,469),activity:state(82,138,40),stress:state(76,112,135),recovery:state(57,64,35)},
  {date:'2026-10-13',sleep:state(53,68,426),activity:state(84,126,20),stress:state(73,102,95),recovery:state(59,66,50)},
  {date:'2026-10-14',sleep:state(50,64,438),activity:state(86,141,55),stress:state(71,98,50),recovery:state(56,63,70)},
  {date:'2026-10-15',
    sleep:state(54,66,444,[{time:'23:12–06:36',minutes:444}]),
    activity:state(74,105,60,[{time:'07:30–08:30',minutes:60}]),
    stress:state(67,70,20,[{time:'09:00–09:20',minutes:20}]),
    recovery:state(61,64,45,[{time:'06:45–07:15',minutes:30},{time:'09:20–09:35',minutes:15}])}
];
PULSE_DEMO_DAYS.forEach((day,index)=>{
  for(const key of ['stress','recovery'])day[key].demoGuideScore=demoGuideScores[key][index];
});
// Short, explicitly fictional observation windows for the weekly chart.
// Their local ranges share the same samples as the trend. Whole-day state
// extremes above belong to the summary cards, not to each chart stroke.
const weeklyContexts=[
  ['sleep','sleep','recovery','stress','stress','activity','activity','recovery'],
  ['sleep','sleep','sleep','activity','activity','stress','stress','recovery'],
  ['sleep','sleep','recovery','stress','stress','stress','recovery','recovery'],
  ['sleep','sleep','recovery','stress','activity','activity','stress','recovery'],
  ['sleep','sleep','recovery','stress','stress','activity','stress','recovery'],
  ['sleep','sleep','recovery','activity','activity','stress','recovery','recovery'],
  ['sleep','sleep','sleep','sleep','recovery','activity','stress','recovery']
];
const weeklyFractions=[.35,.18,.42,.56,.72,.62,.38,.75];
const weeklyReadings=PULSE_DEMO_DAYS.flatMap((day,dayIndex)=>weeklyContexts[dayIndex].map((context,slot)=>{
  const state=day[context],span=state.high-state.low;
  const time=dayIndex===6?['00:00','02:00','04:00','06:00','07:00','08:00','09:00','09:35'][slot]:`${String(slot*3).padStart(2,'0')}:00`;
  let value=Math.round(state.low+span*weeklyFractions[(slot+dayIndex)%weeklyFractions.length]);
  if(slot===7)value=[67,65,66,63,65,62,64][dayIndex];
  if(dayIndex===6)value=PULSE_DEMO_DAY.values[PULSE_DEMO_DAY.labels.indexOf(time)];
  const halfRange=Math.max(3,Math.round(span*(context==='activity'?.18:.24)));
  const low=Math.min(value,Math.max(state.low,value-halfRange));
  const high=Math.max(value,Math.min(state.high,value+halfRange));
  return {date:day.date,time,value,low,high,context};
}));
export const PULSE_DEMO_WEEK={
  dates:weeklyReadings.map(row=>row.date),labels:weeklyReadings.map(row=>row.time),
  values:weeklyReadings.map(row=>row.value),
  ranges:weeklyReadings.map(({low,high,context})=>({low,high,context}))
};

// Additional fictional records for calendar month/year views. Existing authored
// days are reused, so their totals agree across every period.
export const PULSE_DEMO_ARCHIVE=Array.from({length:288},(_,index)=>{
  const date=new Date(Date.UTC(2026,0,1+index)).toISOString().slice(0,10);
  const known=PULSE_DEMO_DAYS.find(day=>day.date===date);
  if(known)return known;
  // A slow authored cycle gives the long-period demo a visible trend instead
  // of averaging the same repeating week to an identical value every month.
  const cycle=Math.round([6,4,2,1,-2,-3,-2,-1,1,0][Number(date.slice(5,7))-1]+2*Math.sin(index/17));
  const shift=[0,2,-1,1,-2,0,3,-1][index%8]+cycle,active=index%7!==3;
  return {date,
    sleep:state(52+shift,67+shift,410+(index*17)%65),
    activity:active?state(78+shift,116+(index*7)%28+cycle,25+(index*11)%45):state(null,null,0),
    stress:{...state(69+shift,94+(index*3)%14+cycle,40+(index*13)%90),demoGuideScore:demoGuideScores.stress[index%7]},
    recovery:{...state(57+shift,66+shift,35+(index*7)%55),demoGuideScore:demoGuideScores.recovery[index%7]}};
});
const summarySeries=(groups,aggregation)=>({
  aggregation,
  dates:groups.map(group=>group.at(-1).date),
  starts:groups.map(group=>group[0].date),
  labels:groups.map(group=>group.at(-1).date),
  values:groups.map(group=>{
    const states=group.flatMap(day=>['sleep','activity','stress','recovery'].map(key=>day[key])).filter(item=>item.minutes);
    return Math.round(states.reduce((sum,item)=>sum+(item.low+item.high)/2*item.minutes,0)/states.reduce((sum,item)=>sum+item.minutes,0));
  }),
  ranges:groups.map(group=>{
    const states=group.flatMap(day=>['sleep','activity','stress','recovery'].map(key=>day[key])).filter(item=>item.minutes);
    return {low:Math.min(...states.map(item=>item.low)),high:Math.max(...states.map(item=>item.high)),context:'summary'};
  })
});
export const PULSE_DEMO_MONTH=summarySeries(PULSE_DEMO_ARCHIVE.filter(day=>day.date.startsWith('2026-10')).map(day=>[day]),'day');
export const PULSE_DEMO_YEAR=summarySeries(Array.from({length:10},(_,month)=>PULSE_DEMO_ARCHIVE.filter(day=>Number(day.date.slice(5,7))===month+1)),'month');
