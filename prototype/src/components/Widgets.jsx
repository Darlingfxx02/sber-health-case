import {useState} from 'react';
import {canOpenDetail} from '../case-scope.js';
import {ACTIVITY_DAYS,CARDS,RESULTS,activityContext,formatHealthValue,metricsForDay} from '../data.js';
import {Icon} from './Icon.jsx';
import {GOALS} from '../../activity-model.js';
import {WidgetAssistant} from './WidgetAssistant.jsx';
import {MetricRange} from './MetricRange.jsx';
import {appointmentDays} from '../appointment-days.js';
import {useHorizontalDrag} from '../hooks/useHorizontalDrag.js';
import {useAnimatedReading} from '../hooks/useAnimatedReading.js';

function ActivityRings({progress}){
  return <svg className="activity-rings" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {GOALS.map((goal,index)=>{
      const radius=27-index*7,value=Math.min(100,Math.max(0,Number(progress[index])||0));
      return <g key={goal.id} stroke={goal.color} strokeWidth="5" transform="rotate(-90 32 32)">
        <circle cx="32" cy="32" r={radius} opacity=".15"/>
        {value>0&&<circle cx="32" cy="32" r={radius} pathLength="100" strokeDasharray={value<100?`${value} 100`:undefined} strokeLinecap="round"/>}
      </g>;
    })}
  </svg>;
}

export function ActivityStrip({selected=ACTIVITY_DAYS[0].id,onOpen,onSelect,detail=false,compact=false}){
  return <div className={`activity-history-track${detail?' activity-center-track':''}${compact?' activity-chat-track':''}`} aria-label="Выбрать день">
    {ACTIVITY_DAYS.map(day=><button className="activity-ring-day" key={day.id} aria-pressed={selected===day.id} aria-label={`${day.date}. Показать данные`} aria-description={GOALS.map((goal,i)=>`${goal.title}: ${day.values[i]}`).join('. ')} onClick={()=>onSelect?onSelect(day):onOpen(activityContext(day))}>
      <span className="activity-date-number">{day.shortDate}</span><ActivityRings progress={day.progress}/>
    </button>)}
  </div>;
}
export function MetricValue({metric,value=metric.series.week.values.at(-1),detail=false}){
  if(value===null)return <span>—</span>;
  if(metric.id==='steps')return <><span>{value.toLocaleString('ru-RU')}</span>{detail&&<small>{metric.unit}</small>}</>;
  return metric.id==='sleep'?<><span className="metric-pair">{Math.floor(value/60)}<small>ч</small></span><span className="metric-pair">{value%60}<small>{detail?'мин':'м'}</small></span></>:<><span>{value}</span><small>{metric.unit}</small></>;
}
function MetricCard({metric,onOpen,animate}){
  const animatedReading=useAnimatedReading(metric.reading,animate);
  const displayedReading=animatedReading===null?null:Math.round(animatedReading);
  const values=metric.series.week.values;
  const title=metric.id==='oxygen'?'Кислород':metric.title;
  const icon=({pulse:'heart-fill',oxygen:'drop-fill',sleep:'moon-fill',steps:'distance-fill'})[metric.id];
  const observation=metric.lastObservation;
  const description=(metric.goal?`Цель на день: ${formatHealthValue(metric,metric.goal)}. Шкала — прогресс к цели.`:`Шкала: от ${formatHealthValue(metric,Math.min(...values))} до ${formatHealthValue(metric,Math.max(...values))} за неделю. Точка — выбранный день.`)+(observation?` Последнее измерение в ${observation.time}${observation.label?`, состояние: ${observation.label}`:''}.`:'');
  return <button className={`health-tile ${metric.id}-tile`} onClick={()=>onOpen(metric)} disabled={metric.reading===null||!canOpenDetail(metric)} aria-label={`${metric.title}, ${metric.value}, ${metric.selectedDate}. Открыть динамику${metric.id==='pulse'?'':' за неделю'}`} aria-description={description}>
    <span className="health-tile-title"><Icon name={icon}/><span>{title}</span></span><span className="health-tile-reading" aria-hidden="true"><span className="health-reading-content"><span className="health-number"><MetricValue metric={metric} value={displayedReading}/></span>{metric.goal&&<span className="health-goal">из {metric.goal.toLocaleString('ru-RU')}</span>}</span></span><MetricRange values={values} value={metric.reading} displayValue={animatedReading} goal={metric.goal}/>
  </button>;
}
function CareCard({planned}){
  const days=appointmentDays(CARDS,planned);
  const drag=useHorizontalDrag();
  return <section className="medical-section" aria-label="Записи"><div className="medical-section-heading"><h2>Записи</h2><span className="medical-section-action"><Icon name="add"/>Записаться</span></div>
    <div className="appointment-grid" role="region" aria-label="Лента записей по дням" tabIndex={0} {...drag}>
      {days.map(day=><section className="appointment-entry" key={day.date} aria-label={`Записи: ${day.label}`}>
        <span className="appointment-day">{day.label}</span>
        <div className="appointment-day-cards">{day.entries.map(entry=><article className="appointment-card" key={entry.id} aria-label={entry.item?`${entry.item.title}, ${entry.item.meta}`:`${entry.title}, ${day.label}, ${entry.time}, ${entry.format}`}>
          <span className="appointment-title"><Icon name={entry.icon}/><span>{entry.title}</span></span>
          {entry.format&&<small className="appointment-time">{entry.format} · демо</small>}
          <span className="appointment-date"><span>{entry.time}</span><Icon name="chevron-right"/></span>
        </article>)}</div>
      </section>)}
    </div>
  </section>;
}
function ClinicEntry(){
  // Visual entry only: the clinic screen is outside this prototype's scope.
  return <section className="clinic-entry" aria-labelledby="clinic-entry-title">
    <span className="clinic-entry-symbol"><img src="assets/clinic/clinic-plus-pink-frosted.png" alt="" width="64" height="64" draggable="false"/></span>
    <div className="clinic-entry-copy"><h2 id="clinic-entry-title">Моя поликлиника</h2><p>Запись к врачу и документы</p></div>
    <Icon name="chevron-right"/>
  </section>;
}
function Documents(){
  return <>
    <section className="medical-section" aria-label="Анализы"><div className="medical-section-heading"><h2>Анализы</h2><span>{RESULTS[0].meta.split(' · ')[0]}</span></div>
      <div className="medical-document-list">{RESULTS.map(item=><div className="medical-document-row" key={item.id} aria-label={`${item.title}, ${item.meta}`}>
        <span className="medical-file-symbol" style={{'--file-color':item.color}}><Icon name="document-fill"/><i/></span><span className="medical-document-name">{item.title}</span><Icon name="chevron-right"/>
      </div>)}</div>
    </section>
  </>;
}
export function Widgets({active,motionActive=active,section,onOpen,onAttach,onVoice,planned}){
  const [selectedId,setSelectedId]=useState(ACTIVITY_DAYS[0].id);
  const day=ACTIVITY_DAYS.find(item=>item.id===selectedId),metrics=metricsForDay(day);
  return <section className="widget-panel" id="widget-panel" role="tabpanel" aria-labelledby="tab-widgets" aria-hidden={!active} inert={!active}>
    {section==='records'&&<div className="section-heading"><h2>Медкарта</h2><button aria-label="Добавить документ" onClick={onAttach}><Icon name="add"/></button></div>}
    <div className="health-overview">
      {section==='home'&&<section className="activity-history" id="metrics"><ActivityStrip selected={day.id} onSelect={next=>setSelectedId(next.id)}/></section>}
      {section==='home'&&<WidgetAssistant active={active} motionActive={motionActive} day={day} onVoice={onVoice}/>}
      {section==='home'&&<><dl className="activity-day-summary" aria-label={`Активность за ${day.date}`}>{GOALS.map((goal,index)=><div key={goal.id} data-mascot-target={goal.id} style={{'--cue-color':goal.color}}><dt aria-label={goal.title} style={{color:goal.color}}><Icon name={['calories-burned-fill','distance-fill','calories-eaten-fill'][index]}/></dt><dd className={day.values[index]==='Нет записей'?'is-empty':undefined}>{day.values[index]}</dd></div>)}</dl>
        <ClinicEntry/>
        <section className="health-bento"><div className="health-section-heading"><h2>Показатели</h2><span aria-live="polite">{day.date}</span></div>{metrics.map(metric=><MetricCard key={metric.id} metric={metric} onOpen={onOpen} animate={active&&motionActive}/>)}</section>
        <CareCard planned={planned}/></>}
      <Documents/>
    </div>
  </section>;
}
