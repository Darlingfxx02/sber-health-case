import {useId} from 'react';
import {PULSE_STATES,PULSE_PERIODS,pulseBreakdown,pulseDuration,pulseDurationTrend,smoothPulsePath} from '../pulse-chart.js';
import {MetricRange} from './MetricRange.jsx';
import {Icon} from './Icon.jsx';
import {useAnimatedReading} from '../hooks/useAnimatedReading.js';

function DurationValue({minutes}){
  const hours=Math.floor(minutes/60),remainder=minutes%60;
  return <span className="pulse-duration">{hours>0&&<span>{hours}<small>ч</small></span>}{(remainder>0||hours===0)&&<span>{remainder}<small>мин</small></span>}</span>;
}

function DurationTrend({metric,item}){
  const gradient=`duration-trend-${useId().replaceAll(':','')}`;
  const edgeGradient=`${gradient}-edges`,edgeMask=`${gradient}-mask`;
  const rows=pulseDurationTrend(metric,item.key),values=rows.map(row=>row.minutes);
  const low=Math.min(...values),high=Math.max(...values),span=Math.max(30,high-low),middle=(low+high)/2;
  const first=rows.length?Date.parse(rows[0].date):0,last=rows.length?Date.parse(rows.at(-1).date):0;
  const points=rows.map(row=>({x:rows.length===1?80:4+(Date.parse(row.date)-first)/(last-first)*152,y:26-(row.minutes-middle)/span*34}));
  const path=points.length>1?smoothPulsePath(points,true):null;
  return <svg className="pulse-duration-trend" viewBox="0 0 160 52" preserveAspectRatio="none" fill="none" role="img" aria-label={`${item.label}: средняя дневная продолжительность за последние 7 суток${rows.length?'':', нет данных'}`}>
    <desc>Скользящее среднее за три дня. {rows.map(row=>`${row.date}: ${pulseDuration(Math.round(row.minutes))}`).join('; ')}</desc>
    <defs>
      <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={item.color} stopOpacity=".14"/><stop offset="1" stopColor={item.color} stopOpacity="0"/></linearGradient>
      <linearGradient id={edgeGradient} x1="4" y1="0" x2="156" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0"/><stop offset=".14" stopColor="white"/><stop offset="1" stopColor="white"/></linearGradient>
      <mask id={edgeMask} x="0" y="0" width="160" height="52" maskUnits="userSpaceOnUse"><rect width="160" height="52" fill={`url(#${edgeGradient})`}/></mask>
    </defs>
    {path&&<><path d={`${path} L${points.at(-1).x},52 L${points[0].x},52 Z`} fill={`url(#${gradient})`} mask={`url(#${edgeMask})`}/><path d={path} stroke={item.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></>}
    {points.length>0&&<circle cx={points.at(-1).x} cy={points.at(-1).y} r="2.75" fill={item.color}/>}
  </svg>;
}

function PulseRangeCard({title,icon,low,high,latest,color,label,isEmpty=false,horizontal=false}){
  const displayedLow=useAnimatedReading(isEmpty?null:low);
  const displayedHigh=useAnimatedReading(isEmpty?null:high);
  const displayedLatest=useAnimatedReading(latest);
  const roundedLow=Math.round(displayedLow??low),roundedHigh=Math.round(displayedHigh??high);
  const value=isEmpty?'Нет данных':roundedLow===roundedHigh?roundedLow:`${roundedLow}–${roundedHigh}`;
  return <div className={`pulse-state-card${horizontal?' is-horizontal':''}`} style={{'--state-color':color}}>
    <h2 className="pulse-state-title"><Icon name={icon}/><span>{title}</span></h2>
    <span className={`pulse-state-value${isEmpty?' is-empty':''}`} aria-hidden="true"><span>{value}</span>{!isEmpty&&<small>уд/мин</small>}</span>
    <MetricRange className="pulse-state-meter" values={isEmpty?[]:[low,high]} value={latest} displayValues={[displayedLow,displayedHigh]} displayValue={displayedLatest} label={label} horizontal={horizontal}/>
  </div>;
}

function PulseDurationCard({metric,item}){
  const minutes=Math.round(useAnimatedReading(item.minutes));
  return <div className={`pulse-state-card is-counter${minutes>=6000?' has-long-duration':''}`} aria-label={`${item.label}: ${pulseDuration(item.minutes)}`}>
    <h2 className="pulse-state-title"><Icon name={item.icon}/><span>{item.label}</span></h2>
    <DurationTrend metric={metric} item={item}/>
    <span className="pulse-state-value" aria-hidden="true"><DurationValue minutes={minutes}/></span>
  </div>;
}

export function PulseBreakdown({metric,period,referenceRange}){
  const items=pulseBreakdown(metric,period);
  const sleep=items.find(item=>item.key==='sleep'),activity=items.find(item=>item.key==='activity');
  // Prefer individual readings; historical days use the available detailed series.
  const measurements=metric.series.day||metric.detailSeries?.week;
  function latestFor(key){
    if(!measurements)return null;
    for(let index=measurements.values.length-1;index>=0;index--){
      const context=measurements.contexts?.[index]||measurements.ranges?.[index]?.context;
      if(context===key)return measurements.values[index];
    }
    return null;
  }
  function rangeCard(item,title,icon,horizontal=false){
    const empty=!item||item.low===null;
    const value=empty?'Нет данных':item.low===item.high?item.low:`${item.low}–${item.high}`;
    const latest=empty?null:item.current??latestFor(item.key);
    const label=empty?`${title}: нет данных`:`${title}: диапазон ${value} уд/мин${latest!==null?`; последнее измерение ${latest} уд/мин`:''}${item.count?`; диапазон за ${item.count} дней`:''}`;
    return <PulseRangeCard title={title} icon={icon} low={item?.low} high={item?.high} latest={latest} color={item?.color||PULSE_STATES.rest.color} label={label} isEmpty={empty} horizontal={horizontal}/>;
  }
  return <section className="pulse-breakdown" aria-label={`Сводка ${PULSE_PERIODS[period].suffix}`}>
    {rangeCard(referenceRange,'Покой',PULSE_STATES.rest.icon)}
    {rangeCard(sleep,'Сон',PULSE_STATES.sleep.icon)}
    {rangeCard(activity,'Активность',PULSE_STATES.activity.icon,true)}
    {items.filter(item=>['stress','recovery'].includes(item.key)).map(item=><PulseDurationCard key={item.key} metric={metric} item={item}/>)}
  </section>;
}
