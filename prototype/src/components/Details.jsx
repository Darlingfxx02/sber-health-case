import {useEffect,useRef,useState} from 'react';
import {formatHealthValue,CARE} from '../data.js';
import {GOALS} from '../../activity-model.js';
import {Icon} from './Icon.jsx';
import {MetricValue,ActivityStrip} from './Widgets.jsx';
import {PulseDetails} from './PulseDetails.jsx';

function MetricDetails({metric,onContext}){
  const [period,setPeriod]=useState('week'),[selected,setSelected]=useState(metric.selectedIndex??metric.series.week.values.length-1);
  const series=metric.series[period],value=series.values[selected];
  const low=Math.min(...series.values),high=Math.max(...series.values),span=Math.max(high-low,1);
  const points=series.values.map((v,i)=>[8+i*304/(series.values.length-1),152-(.2+.65*(v-low)/span)*144]);
  const path=points.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' ');
  useEffect(()=>onContext({...metric,id:`${metric.id}-${period}-${selected}`,title:`${metric.title} · ${series.labels[selected]}`,value:formatHealthValue(metric,value),meta:period==='day'?`${metric.selectedDate||'15 октября'} · выбранное измерение`:'Выбранный день'}),[metric,period,selected,onContext]);
  return <div className={`health-metric-detail ${metric.id}-detail`} style={{'--metric-color':metric.color}}>
    <div className="metric-detail-summary"><div className="metric-detail-number"><MetricValue metric={metric} value={value} detail/></div><p>{series.labels[selected]}{period==='day'?` · ${metric.selectedDate||'15 октября'}`:''}{metric.id==='sleep'&&selected===series.values.length-1?' · 23:48–07:12':''}</p>{metric.goal&&<p>Цель на день · {formatHealthValue(metric,metric.goal)}</p>}</div>
    <div className="metric-period" aria-label="Период показателя">{Object.keys(metric.series).map(key=><button key={key} aria-pressed={period===key} onClick={()=>{setPeriod(key);setSelected(key==='week'?(metric.selectedIndex??metric.series.week.values.length-1):metric.series[key].values.length-1);}}>{key==='day'?'День':'Неделя'}</button>)}</div>
    <div className="metric-detail-chart"><svg viewBox="0 0 320 160" fill="none" aria-hidden="true"><path d="M8 25H312M8 80H312M8 135H312" stroke="#e8ecf0" strokeDasharray="3 5"/><path d={path} stroke={metric.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/><circle cx={points[selected][0]} cy={points[selected][1]} r="6" fill={metric.color} stroke="#fff" strokeWidth="3"/></svg>
      <div className="metric-chart-targets">{series.values.map((v,i)=><button key={i} aria-pressed={selected===i} aria-label={`${series.labels[i]}, ${formatHealthValue(metric,v)}`} onClick={()=>setSelected(i)}>{(series.values.length<=7||[0,Math.floor(series.values.length/2),series.values.length-1].includes(i))&&<span aria-hidden="true">{series.labels[i]}</span>}</button>)}</div>
    </div>
    <dl className="metric-summary-row"><div><dt>Минимум</dt><dd>{formatHealthValue(metric,low)}</dd></div><div><dt>Максимум</dt><dd>{formatHealthValue(metric,high)}</dd></div></dl>
    <p className="metric-source"><Icon name="activity"/>{period==='week'?`Часы · ${series.labels[selected]}`:metric.source}<span>Демонстрационные измерения</span></p>
  </div>;
}
function CareDetails({planned,onPlan,onContext}){
  const [format,setFormat]=useState(planned?.format||'Онлайн'),[specialty,setSpecialty]=useState(planned?.specialty||'Терапевт'),[slot,setSlot]=useState(planned?.slot||'Сегодня, 12:30'),[complete,setComplete]=useState(Boolean(planned));
  useEffect(()=>onContext({...CARE,title:complete?`Запись: ${specialty}`:'Обращение к врачу',meta:`${specialty} · ${format.toLowerCase()} · ${slot}`}),[format,specialty,slot,complete,onContext]);
  return <div className="care-detail">{complete?<><div className="care-success"><h2>В вашем плане</h2><p>{specialty} · {format.toLowerCase()}<br/>{slot}</p><span>Демонстрационная запись</span></div><button className="care-secondary" onClick={()=>setComplete(false)}>Изменить</button></>:<>
    <div className="care-formats" aria-label="Формат приёма">{['Онлайн','В клинике'].map(v=><button key={v} aria-pressed={v===format} onClick={()=>setFormat(v)}><Icon name={v==='Онлайн'?'chat':'home'}/>{v}</button>)}</div>
    <h2 className="care-field-label">Специалист</h2><div className="care-specialties">{['Терапевт','Кардиолог','Эндокринолог'].map(v=><button key={v} aria-pressed={v===specialty} onClick={()=>setSpecialty(v)}><span>{v}</span><Icon name={v===specialty?'check':'chevron-right'}/></button>)}</div>
    <h2 className="care-field-label">Ближайшее время</h2><div className="care-slots">{['Сегодня, 12:30','Сегодня, 15:00','Завтра, 10:00'].map(v=><button key={v} aria-pressed={v===slot} onClick={()=>setSlot(v)}>{v}</button>)}</div>
    <button className="care-confirm" onClick={()=>{onPlan({format,specialty,slot});setComplete(true);}}>Добавить в план <Icon name="add"/></button><p className="care-demo-note">Демо · без отправки записи в клинику</p>
  </>}</div>;
}
function ActivityDetails({item,onOpen}){
  const ref=useRef(null);
  useEffect(()=>{const selected=ref.current.querySelector('[aria-pressed="true"]'),track=selected?.parentElement;if(track)track.scrollLeft=Math.max(0,selected.offsetLeft-track.offsetLeft-(track.clientWidth-selected.offsetWidth)/2);},[item.id]);
  return <div className="activity-center" ref={ref}><ActivityStrip selected={item.day.id} onOpen={onOpen} detail/><h2 className="activity-center-date">{item.day.date}</h2><dl className="activity-day-values">{GOALS.map((goal,i)=><div key={goal.id}><dt><span style={{background:goal.color}} aria-hidden="true"/>{goal.title}</dt><dd>{item.day.values[i]}</dd></div>)}</dl></div>;
}
function RecordDetails({item}){
  if(item.kind==='result')return <><p className="detail-sub">{item.meta}</p><img className="result-detail-preview" src={item.preview} alt={`Демонстрационный документ: ${item.title}`} draggable={false}/></>;
  const values=item.details||(item.id==='labs'?['17 октября, 08:30','Общий анализ крови · ферритин','Назначение терапевта от 2 октября']:item.id==='appointment'?['22 октября, 16:00','Обсудить результаты анализов','Подготовить вопросы о дальнейшем наблюдении']:['Приём терапевта · 2 октября','Рекомендации и назначения','Демонстрационная карточка документа']);
  return <ul className="detail-list">{values.map(value=><li key={value}>{value}</li>)}</ul>;
}
export function DetailPanel({item,onClose,backSwipe,onDiscuss,onContext,onOpen,planned,onPlan}){
  const backRef=useRef(null);
  useEffect(()=>{backRef.current?.focus({preventScroll:true});},[item,onContext]);
  if(item.id==='pulse')return <PulseDetails metric={item} onClose={onClose} backSwipe={backSwipe} onContext={onContext}/>;
  return <section className="detail-panel open" id="detail-panel" aria-label="Подробности"><div className="detail-head"><button ref={backRef} aria-label="Назад" onClick={onClose}><Icon name="back"/></button><button aria-label="Добавить в чат" onClick={onDiscuss}><Icon name="chat"/></button></div><h1 className="detail-title">{item.title}</h1>
    {item.kind==='metric'?<MetricDetails metric={item} onContext={onContext}/>:item.kind==='care'?<CareDetails planned={planned} onPlan={onPlan} onContext={onContext}/>:item.kind==='activity'?<ActivityDetails item={item} onOpen={onOpen}/>:<RecordDetails item={item}/>}
    <button className="detail-cta" onClick={onDiscuss}><Icon name="chat"/><span>Обсудить</span></button>
  </section>;
}
