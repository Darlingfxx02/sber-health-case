export const PULSE_STATES={
  sleep:{label:'Сон',color:'#269ae2',icon:'moon-fill'},
  rest:{label:'Покой',color:'#2fbc90',icon:'rest-fill'},
  activity:{label:'Активность',color:'#f78742',icon:'distance-fill'},
  stress:{label:'Стресс',color:'#ef5b91',icon:'stress-fill'},
  recovery:{label:'Отдых',color:'#9460ed',icon:'recovery-fill'},
  summary:{label:'Все измерения',color:'#2fbc90',icon:'heart-beat-fill'}
};

export const PULSE_PERIODS={day:{label:'День',total:'За день',suffix:'за день'},week:{label:'Неделя',total:'Всего за неделю',suffix:'за неделю'},month:{label:'Месяц',total:'Всего за месяц',suffix:'за месяц'},year:{label:'Год',total:'Всего за год',suffix:'за год'}};
const formatDate=(date,options)=>new Intl.DateTimeFormat('ru-RU',{...options,timeZone:'UTC'}).format(new Date(`${date}T00:00:00Z`)).replace(/\.$/,'');
const capitalize=text=>text[0].toUpperCase()+text.slice(1);

export const pulseSeries=(metric,period)=>metric.detailSeries?.[period]||metric.series[period];
export function pulseInitialIndex(metric,period){
  const series=pulseSeries(metric,period);
  if(period==='year')return Math.max(0,series.dates.findIndex(date=>date.slice(0,7)===(metric.selectedDayId||series.dates.at(-1)).slice(0,7)));
  return period==='day'?series.values.length-1:Math.max(0,series.dates.lastIndexOf(metric.selectedDayId||series.dates.at(-1)));
}
export const pulseDateLabel=date=>formatDate(date,{day:'numeric',month:'short'});
export function pulseSelectionLabel(series,index,period){
  if(period==='day')return `В ${series.labels[index]}`;
  if(period==='year')return capitalize(formatDate(series.dates[index],{month:'long'}));
  return `${pulseDateLabel(series.dates[index])}${period==='week'?`, ${series.labels[index]}`:''}`;
}
export function pulseHeaderLabel(series,index,period){
  if(period==='day')return series.labels[index];
  return period==='year'?pulseSelectionLabel(series,index,period):pulseDateLabel(series.dates[index]);
}
export function pulsePeriodLabel(metric,period){
  const series=pulseSeries(metric,period),last=series.dates?.at(-1);
  if(period==='day')return metric.selectedDate||'15 октября';
  if(period==='year')return `${last.slice(0,4)} год`;
  if(period==='month')return `${capitalize(formatDate(last,{month:'long'}))} ${last.slice(0,4)}`;
  return `${Number(series.dates[0].slice(-2))}–${formatDate(last,{day:'numeric',month:'long'})}`;
}

export function pulseObservation(series,index){
  const range=series.ranges?.[index];
  if(range)return {...range,...PULSE_STATES[range.context],time:series.labels[index]};
  const context=series.contexts?.[index];
  return context?{context,...PULSE_STATES[context],time:series.labels[index]}:null;
}

export function pulseDaySeries(metric,date){
  const dailyDate=metric.selectedDayId||metric.series.week.dates.at(-1);
  if(date===dailyDate&&metric.series.day)return metric.series.day;
  const week=metric.detailSeries?.week;
  const indexes=week?.dates.flatMap((sampleDate,index)=>sampleDate===date?[index]:[])||[];
  if(!indexes.length)return undefined;
  // Reuse this date's recorded points, not the latest day's intraday curve.
  return {
    dates:indexes.map(()=>date),
    labels:indexes.map(index=>week.labels[index]),
    values:indexes.map(index=>week.values[index]),
    contexts:indexes.map(index=>week.contexts?.[index]||week.ranges?.[index]?.context)
  };
}

export function pulseLatestObservation(metric,date){
  const series=pulseDaySeries(metric,date);
  if(!series)return null;
  for(let index=series.values.length-1;index>=0;index--){
    if(Number.isFinite(series.values[index])){
      return {...pulseObservation(series,index),date,time:series.labels[index],value:series.values[index]};
    }
  }
  return null;
}

// The history is independent of the chart's zoom. Prefer individual readings
// where available; older daily summaries keep their explicit aggregation label.
export function pulseReadingHistory(metric,visibleDays=7){
  const week=pulseSeries(metric,'week'),day=pulseSeries(metric,'day'),month=pulseSeries(metric,'month');
  const end=metric.selectedDayId||week.dates.at(-1);
  const start=new Date(`${end}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate()-visibleDays+1);
  const cutoff=start.toISOString().slice(0,10);
  const detailedDates=new Set(week.dates);
  const entries=[];
  function append(series,period){
    if(!series)return;
    series.values.forEach((reading,index)=>{
      const date=period==='day'?end:series.dates[index];
      if(date>end||period==='week'&&day&&date===end||period==='month'&&detailedDates.has(date))return;
      const time=period==='month'?'':series.labels[index];
      entries.push({id:`${period}-${index}`,date,time,reading,index,period,
        label:`${pulseDateLabel(date)}${time?`, ${time}`:' · среднее'}`,
        state:pulseObservation(series,index)});
    });
  }
  append(day,'day');append(week,'week');append(month,'month');
  entries.sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return {readings:entries.filter(entry=>entry.date>=cutoff),hasMore:entries.some(entry=>entry.date<cutoff)};
}

export function pulseDuration(minutes){
  if(!minutes)return '0 мин';
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return [hours?`${hours} ч`:'',rest?`${rest} мин`:''].filter(Boolean).join(' ');
}

// A quiet seven-day trend of duration, smoothed with trailing three-day means.
// Use only recorded days and never pull future data into an earlier day's view.
export function pulseDurationTrend(metric,key){
  const end=metric.selectedDayId||metric.series.week.dates.at(-1);
  const dayMs=86400000,endTime=Date.parse(`${end}T00:00:00Z`);
  const records=(metric.pulseDays||[]).filter(day=>day.date<=end&&Number.isFinite(day[key]?.minutes))
    .sort((a,b)=>a.date.localeCompare(b.date));
  return records.filter(day=>Date.parse(`${day.date}T00:00:00Z`)>=endTime-6*dayMs).map(day=>{
    const since=Date.parse(`${day.date}T00:00:00Z`)-2*dayMs;
    const samples=records.filter(record=>record.date<=day.date&&Date.parse(`${record.date}T00:00:00Z`)>=since);
    return {date:day.date,minutes:samples.reduce((sum,record)=>sum+record[key].minutes,0)/samples.length};
  });
}

export function pulseBreakdown(metric,period){
  const series=pulseSeries(metric,period);
  const dates=period==='day'?[metric.selectedDayId||metric.series.week.dates.at(-1)]:metric.series.week.dates;
  const records=(metric.pulseDays||[]).filter(day=>series?.aggregation?day.date>=series.starts[0]&&day.date<=series.dates.at(-1):dates.includes(day.date));
  return ['sleep','activity','stress','recovery'].map(key=>{
    const entries=records.map(day=>({date:day.date,...day[key]})).filter(entry=>entry.minutes>0);
    const minutes=entries.reduce((sum,entry)=>sum+entry.minutes,0);
    const guideScores=entries.map(entry=>entry.demoGuideScore).filter(Number.isFinite);
    const demoGuideScore=guideScores.length?Math.round(guideScores.reduce((sum,score)=>sum+score,0)/guideScores.length):null;
    const low=entries.length?Math.min(...entries.map(entry=>entry.low)):null;
    const high=entries.length?Math.max(...entries.map(entry=>entry.high)):null;
    const rows=period==='day'?entries.flatMap(entry=>entry.segments.map(segment=>({...segment,low:entry.low,high:entry.high}))):period==='year'?series.dates.map(date=>{
      const month=entries.filter(entry=>entry.date.slice(0,7)===date.slice(0,7));
      return {time:capitalize(formatDate(date,{month:'long'})),minutes:month.reduce((sum,entry)=>sum+entry.minutes,0),low:month.length?Math.min(...month.map(entry=>entry.low)):null,high:month.length?Math.max(...month.map(entry=>entry.high)):null};
    }).filter(row=>row.minutes):entries.map(entry=>({...entry,time:formatDate(entry.date,{day:'numeric',month:'long'})}));
    return {key,...PULSE_STATES[key],minutes,low,high,rows,dayCount:records.length,demoGuideScore};
  });
}

// Rounded joins with bounded control points: no invented extrema between samples.
export function smoothPulsePath(points,roundExtrema=false){
  if(points.length<2)return `M${points[0].x},${points[0].y}`;
  const slope=index=>{
    const a=points[Math.max(0,index-1)],b=points[Math.min(points.length-1,index+1)];
    const tangent=(b.y-a.y)/(b.x-a.x||1);
    if(!roundExtrema||index===0||index===points.length-1)return tangent;
    const point=points[index],before=(point.y-a.y)/(point.x-a.x),after=(b.y-point.y)/(b.x-point.x);
    // A shared horizontal tangent rounds each peak; limiting the other tangents
    // keeps the curve within the measured values despite irregular time gaps.
    if(before*after<=0)return 0;
    return Math.sign(tangent)*Math.min(Math.abs(tangent),3*Math.abs(before),3*Math.abs(after));
  };
  let path=`M${points[0].x},${points[0].y}`;
  for(let index=1;index<points.length;index++){
    const a=points[index-1],b=points[index],dx=(b.x-a.x)/3;
    const clamp=value=>Math.max(Math.min(a.y,b.y),Math.min(Math.max(a.y,b.y),value));
    path+=` C${a.x+dx},${clamp(a.y+slope(index-1)*dx)} ${b.x-dx},${clamp(b.y-slope(index)*dx)} ${b.x},${b.y}`;
  }
  return path;
}

// Preserve actual time spacing, including partial days and irregular samples.
export function pulseChart(series,width=402){
  const {values,labels}=series;
  const times=labels.map((label,index)=>series.aggregation?Date.parse(`${series.dates[index]}T00:00:00Z`)/60000:/^\d{2}:\d{2}$/.test(label)?(series.dates?Date.parse(`${series.dates[index]}T${label}:00Z`)/60000:Number(label.slice(0,2))*60+Number(label.slice(3))):index);
  const low=Math.min(...values),high=Math.max(...values);
  const hasRanges=Boolean(series.ranges?.length);
  const rangeHigh=hasRanges?Math.max(...series.ranges.map(range=>range.high)):high;
  const minimum=hasRanges?0:Math.floor((low-3)/10)*10,maximum=hasRanges?Math.ceil((rangeHigh+5)/50)*50:Math.ceil((high+3)/10)*10;
  const edgeFade=16,left=edgeFade,right=width-56,top=16,bottom=184,height=220,axisY=210;
  const y=value=>bottom-(value-minimum)/(maximum-minimum)*(bottom-top);
  const duration=times.at(-1)-times[0];
  const points=values.map((value,index)=>({x:duration?left+(times[index]-times[0])/duration*(right-left):(left+right)/2,y:y(value)}));
  const path=smoothPulsePath(points,!hasRanges||Boolean(series.aggregation));
  const area=`${path}L${right},${bottom}L${left},${bottom}Z`;
  const ranges=series.ranges?.map((range,index)=>{
    const point=points[index],gap=Math.min(index?point.x-points[index-1].x:Infinity,index<points.length-1?points[index+1].x-point.x:Infinity);
    return {...range,index,x:point.x,top:y(range.high),bottom:y(range.low),width:Math.min(3.5,gap*.62),color:PULSE_STATES[range.context].color};
  })||[];
  const rangeBand=series.aggregation&&ranges.length?(()=>{
    const upper=ranges.map(range=>({x:range.x,y:range.top}));
    const lower=ranges.map(range=>({x:range.x,y:range.bottom}));
    const upperPath=smoothPulsePath(upper,true),lowerPath=smoothPulsePath(lower,true);
    return {upper:upperPath,lower:lowerPath,area:`${upperPath} ${smoothPulsePath([...lower].reverse(),true).replace(/^M/,'L')}Z`};
  })():null;
  const step=hasRanges?50:Math.max(10,Math.ceil((maximum-minimum)/40)*10);
  const ticks=[];for(let value=minimum;value<=maximum;value+=step)ticks.push({value,y:bottom-(value-minimum)/(maximum-minimum)*(bottom-top)});
  const middle=nearestPulsePoint(points,(left+right)/2);
  // Calendar ticks stay fixed when the period is incomplete or a sample is missing.
  const indexes=values.map((_,index)=>index);
  const axis=series.aggregation==='month'
    ?indexes.filter(index=>Number(series.dates[index].slice(5,7))%2===1)
    :series.aggregation==='day'
      ?indexes.filter(index=>(Number(series.dates[index].slice(-2))-1)%7===0)
      :hasRanges?indexes.filter(index=>index===0||series.dates[index]!==series.dates[index-1]):[...new Set([0,middle,values.length-1])];
  const axisLabels=labels.map((label,index)=>series.aggregation==='month'?formatDate(series.dates[index],{month:'short'}):hasRanges?Number(series.dates[index].slice(-2)):label);
  return {width,height,left,right,top,bottom,points,ranges,rangeBand,path,area,ticks,axis,axisLabels,axisY,edgeFade,low,high,average:Math.round(values.reduce((sum,v)=>sum+v,0)/values.length)};
}

export function pulsePointLabel(plot,index){
  const point=plot.points[index];
  const top=point.y,bottom=point.y;
  const above=top-plot.top,below=plot.bottom-bottom;
  const placement=above>=30||above>=below?'above':'below';
  return {x:point.x,y:placement==='above'?top-14:bottom+24,placement,
    anchor:point.x<plot.left+16?'start':point.x>plot.right-16?'end':'middle'};
}

export function nearestPulsePoint(points,x){
  return points.reduce((best,point,index)=>Math.abs(point.x-x)<Math.abs(points[best].x-x)?index:best,0);
}

function selectedDay(metric,period,index){
  const week=metric.series.week;
  const date=period==='week'?pulseSeries(metric,period).dates[index]:metric.selectedDayId||week.dates.at(-1);
  const dayIndex=week.dates.indexOf(date);
  return {date:week.dates[dayIndex],value:week.values[dayIndex],label:week.labels[dayIndex]};
}

function earlierDays(metric,date){
  const week=metric.series.week;
  const records=[...(metric.history||[]),...week.dates.map((date,index)=>({date,value:week.values[index]}))];
  return [...new Map(records.filter(record=>record.date<date&&Number.isFinite(record.value)).map(record=>[record.date,record])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

// Compare daily summaries with earlier dates only, never with later or intraday samples.
export function pulseComparison(metric,period,index){
  const day=selectedDay(metric,period,index);
  const previous=earlierDays(metric,day.date).slice(-7).map(record=>record.value);
  const current=day.value,count=previous.length;
  if(!count||!Number.isFinite(current))return null;
  const average=Math.round(previous.reduce((sum,value)=>sum+value,0)/count);
  const minimum=Math.min(...previous,current)-3,maximum=Math.max(...previous,current)+3;
  const position=value=>(value-minimum)/(maximum-minimum)*100;
  return {current,average,count,delta:current-average,label:day.label,
    currentPosition:position(current),averagePosition:position(average)};
}

// Descriptive 10th–90th percentile range for the fictional prototype data, not a medical norm.
export function pulseReferenceRange(metric,period,index){
  const day=selectedDay(metric,period,index);
  const records=earlierDays(metric,day.date).slice(-28);
  if(!Number.isFinite(day.value)||records.length<2)return null;
  const values=records.map(record=>record.value).sort((a,b)=>a-b);
  const quantile=p=>{const at=(values.length-1)*p,lower=Math.floor(at),fraction=at-lower;return values[lower]+(values[Math.ceil(at)]-values[lower])*fraction;};
  const low=Math.floor(quantile(.1)),high=Math.ceil(quantile(.9));
  const minimum=Math.min(low,day.value)-4,maximum=Math.max(high,day.value)+4;
  const position=value=>(value-minimum)/(maximum-minimum)*100;
  return {low,high,current:day.value,label:day.label,count:records.length,lowPosition:position(low),highPosition:position(high),currentPosition:position(day.value)};
}

export function pulseContext(metric,period,index){
  const series=pulseSeries(metric,period),label=series.labels[index];
  if(series.aggregation){
    const date=period==='year'?`${pulseSelectionLabel(series,index,period)} ${series.dates[index].slice(0,4)}`:pulseDateLabel(series.dates[index]);
    const range=series.ranges[index];
    return {...metric,id:`pulse-${series.dates[index]}-${period}-${index}`,title:`Пульс · ${date}`,value:`${range.low}–${range.high} уд/мин`,meta:`Средний пульс ${series.values[index]} уд/мин · демонстрационные данные`};
  }
  const date=period==='day'?(metric.selectedDate||'15 октября'):pulseDateLabel(series.dates[index]);
  const dateId=period==='day'?(metric.selectedDayId||'2026-10-15'):series.dates?.[index]||label;
  const observation=pulseObservation(series,index);
  const aggregate=series.ranges?.[index];
  return {...metric,id:`pulse-${dateId}-${period}-${index}`,title:`Пульс · ${date}, ${label}`,value:`${series.values[index]} уд/мин`,meta:`${observation?.label||'Выбранное измерение'}${aggregate?` · диапазон ${aggregate.low}–${aggregate.high} уд/мин`:''} · демонстрационные данные`};
}
