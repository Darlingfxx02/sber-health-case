import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {GlassButton} from '@glass-sdk/liquid-glass';
import {Icon} from './Icon.jsx';
import {PulseBreakdown} from './PulseBreakdown.jsx';
import {GLASS_PRESETS,GlassControlScene} from './Glass.jsx';
import {PULSE_STATES,PULSE_PERIODS,pulseSeries,pulseInitialIndex,pulseSelectionLabel,pulseHeaderLabel,pulsePeriodLabel,nearestPulsePoint,pulseChart,pulsePointLabel,pulseObservation,pulseContext,pulseReferenceRange,pulseReadingHistory} from '../pulse-chart.js';

export function PulseDetails({metric,onClose,onContext}){
  const [period,setPeriod]=useState(metric.series.day?'day':'week');
  const [selected,setSelected]=useState(()=>pulseInitialIndex(metric,metric.series.day?'day':'week'));
  const [chartWidth,setChartWidth]=useState(402);
  const pointer=useRef(null),panelRef=useRef(null),chartRef=useRef(null);
  const gradient=`pulse-area-${useId().replaceAll(':','')}`;
  const readingsId=`${gradient}-readings`,edgeGradient=`${gradient}-edge`,edgeMask=`${gradient}-mask`;
  const series=pulseSeries(metric,period),plot=useMemo(()=>pulseChart(series,chartWidth),[series,chartWidth]);
  const value=series.values[selected],point=plot.points[selected];
  const selectedRange=plot.ranges[selected];
  const guidePath=selectedRange
    ?`M${point.x} ${plot.top}V${Math.max(plot.top,selectedRange.top-2)} M${point.x} ${Math.min(plot.bottom,selectedRange.bottom+2)}V${plot.bottom}`
    :`M${point.x} ${plot.top}V${plot.bottom}`;
  const pointLabel=pulsePointLabel(plot,selected);
  const observation=pulseObservation(series,selected);
  const aggregate=series.ranges?.[selected],hasRanges=Boolean(series.ranges?.length);
  const displayedValue=aggregate?`${aggregate.low}–${aggregate.high}`:value;
  const selectedLabel=pulseSelectionLabel(series,selected,period);
  // The summary belongs to the displayed period, not the inspected chart point.
  const range=useMemo(()=>pulseReferenceRange(metric,period,pulseInitialIndex(metric,period)),[metric,period]);
  const {readings,hasMore}=useMemo(()=>pulseReadingHistory(metric,7),[metric]);
  const periods=Object.entries(PULSE_PERIODS).filter(([key])=>metric.series[key]||metric.detailSeries?.[key]);
  useEffect(()=>{const frame=requestAnimationFrame(()=>panelRef.current?.querySelector('button')?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame);},[]);
  useEffect(()=>{
    const observer=new ResizeObserver(([entry])=>{if(entry.contentRect.width>0)setChartWidth(entry.contentRect.width);});
    observer.observe(chartRef.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>onContext(pulseContext(metric,period,selected)),[metric,period,selected,onContext]);
  useEffect(()=>{
    const enter=event=>{const next=event.detail.period;setPeriod(next);setSelected(pulseInitialIndex(metric,next));};
    window.addEventListener('case:pulse',enter);return()=>window.removeEventListener('case:pulse',enter);
  },[metric]);
  function changePeriod(next){
    setPeriod(next);setSelected(pulseInitialIndex(metric,next));
  }
  function selectAt(event){
    const rect=event.currentTarget.getBoundingClientRect();
    setSelected(nearestPulsePoint(plot.points,(event.clientX-rect.left)/rect.width*plot.width));
  }
  function chartKey(event){
    const delta=({ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1})[event.key];
    if(delta){event.preventDefault();setSelected(Math.max(0,Math.min(series.values.length-1,selected+delta)));}
    else if(event.key==='Home'||event.key==='End'){event.preventDefault();setSelected(event.key==='Home'?0:series.values.length-1);}
  }
  function trapFocus(event){
    if(event.key!=='Tab')return;
    const controls=[...panelRef.current.querySelectorAll('button:not(:disabled),a[href],summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  return <section ref={panelRef} className="detail-panel open pulse-panel" style={{'--pulse-accent':PULSE_STATES.rest.color}} role="dialog" aria-modal="true" aria-labelledby="pulse-detail-title" onKeyDown={trapFocus}>
    <header className="pulse-header">
      <GlassControlScene className="pulse-back-scene"><GlassButton {...GLASS_PRESETS.navigation} size="icon" className="pulse-back" aria-label="Назад" onClick={onClose}><Icon name="chevron-right"/></GlassButton></GlassControlScene>
      <h1 id="pulse-detail-title">Пульс</h1>
      <div className="pulse-info-anchor">
        <GlassControlScene className="pulse-info-scene"><GlassButton {...GLASS_PRESETS.navigation} size="icon" className="pulse-info-button" aria-label="О графике пульса" disabled><Icon name="info"/></GlassButton></GlassControlScene>
      </div>
    </header>
    <div className="pulse-detail-body">
      <section className="pulse-chart-card" aria-label={`График пульса, ${pulsePeriodLabel(metric,period)}`}>
        <div className="pulse-reading-row"><div className="pulse-reading-main"><Icon name="heart-fill"/><p className={`pulse-reading${hasRanges?' is-range':''}`}><span>{displayedValue}</span><small>уд/мин</small></p></div><p className="pulse-reading-time">{pulseHeaderLabel(series,selected,period)}</p></div>
        <div ref={chartRef} className="pulse-chart" role="slider" tabIndex={0} aria-label="Выбрать измерение пульса" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={series.values.length-1} aria-valuenow={selected} aria-valuetext={`${aggregate?'Диапазон ':''}${displayedValue} уд/мин, ${selectedLabel}, ${observation?.label||''}`} onKeyDown={chartKey}
          onPointerDown={event=>{if(event.button!==0)return;pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);selectAt(event);}}
          onPointerMove={event=>{if(pointer.current===event.pointerId)selectAt(event);}}
          onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}} onLostPointerCapture={()=>{pointer.current=null;}}>
          <div className="pulse-chart-grid" aria-hidden="true">{plot.ticks.map(tick=><div key={tick.value} className="pulse-grid-row" style={{top:`${tick.y/plot.height*100}%`}}><i className="pulse-grid-line"/><span>{tick.value}</span></div>)}</div>
          <svg viewBox={`0 0 ${plot.width} ${plot.height}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={PULSE_STATES.rest.color} stopOpacity=".23"/><stop offset="1" stopColor={PULSE_STATES.rest.color} stopOpacity=".015"/></linearGradient>
              <linearGradient id={edgeGradient} x1="0" y1="0" x2={plot.width} y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0"/><stop offset={plot.edgeFade/plot.width} stopColor="white"/><stop offset={1-plot.edgeFade/plot.width} stopColor="white"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
              <mask id={edgeMask} maskUnits="userSpaceOnUse" x="0" y="0" width={plot.width} height={plot.height}><rect width={plot.width} height={plot.height} fill={`url(#${edgeGradient})`}/></mask>
            </defs>
            <path className="pulse-selection-guide" d={guidePath} stroke="#9daea5" strokeWidth="1" strokeDasharray="3 4"/>
            <g mask={`url(#${edgeMask})`}>
              {plot.rangeBand&&<g className="pulse-range-envelope">
                <path d={plot.rangeBand.area} fill={PULSE_STATES.rest.color} fillOpacity=".08"/>
                <path d={plot.rangeBand.upper} stroke={PULSE_STATES.rest.color} strokeOpacity=".16" strokeWidth="1"/>
                <path d={plot.rangeBand.lower} stroke={PULSE_STATES.rest.color} strokeOpacity=".16" strokeWidth="1"/>
                <path className="pulse-selected-range" d={`M${point.x} ${plot.ranges[selected].top}V${plot.ranges[selected].bottom}`} stroke={PULSE_STATES.rest.color} strokeWidth="3" strokeOpacity=".45" strokeLinecap="round"/>
              </g>}
              <path className="pulse-trend-line" d={plot.path} stroke="#239e78" strokeWidth={plot.rangeBand?2:1.8} strokeLinecap="round" strokeLinejoin="round"/>
              {plot.rangeBand?plot.points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="3" fill={PULSE_STATES.rest.color} stroke="white" strokeWidth="1.5"/>):hasRanges?plot.ranges.map((range,index)=><path key={index} className="pulse-interval" data-sample-index={range.index} d={`M${range.x} ${range.top}V${range.bottom}`} stroke={range.color} strokeWidth={range.width+(range.index===selected?.5:0)} strokeOpacity={range.index===selected?1:.95} strokeLinecap="round"/>):<>
                {plot.points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="4" fill={PULSE_STATES[series.contexts?.[index]]?.color||PULSE_STATES.rest.color}/>)}
              </>}
            </g>
            <circle cx={point.x} cy={point.y} r={hasRanges&&!plot.rangeBand?9:11} fill={observation?.color||PULSE_STATES.rest.color} fillOpacity=".12"/><circle cx={point.x} cy={point.y} r={hasRanges&&!plot.rangeBand?4.5:6} fill={observation?.color||PULSE_STATES.rest.color} stroke="white" strokeWidth="2.5"/>
            <text className="pulse-point-label" x={pointLabel.x} y={pointLabel.y} textAnchor={pointLabel.anchor} data-placement={pointLabel.placement}>{value}</text>
            {plot.axis.map(index=><text key={index} x={plot.points[index].x} y={plot.axisY} textAnchor={index===0?'start':index===plot.points.length-1?'end':'middle'}>{plot.axisLabels[index]}</text>)}
          </svg>
        </div>
      </section>
      <div className="pulse-period" data-interaction-hint="group" aria-label="Период графика" style={{'--period-count':periods.length}}>
        <span className="pulse-period-indicator" aria-hidden="true" style={{transform:`translateX(${periods.findIndex(([key])=>key===period)*100}%)`}}/>
        {periods.map(([key,item])=><button key={key} aria-pressed={period===key} onClick={()=>changePeriod(key)}>{item.label}</button>)}
      </div>
      <PulseBreakdown metric={metric} period={period} referenceRange={range}/>
      <section className="pulse-readings" aria-label="Измерения">
        <div className="pulse-section-heading"><h2>Измерения</h2><span>уд/мин</span></div>
        <ul className="pulse-measurement-list" id={readingsId}>{readings.map(({id,reading,index,period:readingPeriod,label,state})=>{
          return <li key={id} data-selected={period===readingPeriod&&selected===index||undefined} aria-label={`${label}, ${reading} уд/мин${state?`, ${state.label}`:''}`}>
            <span className="pulse-measurement-time"><span className="pulse-measurement-state" style={{color:state?.color||'#89939b'}} title={state?.label||'Измерение'}><Icon name={state?.icon||'heart-beat-fill'}/></span><span>{label}</span></span>
            <strong>{reading}</strong>
          </li>;
        })}</ul>
        {hasMore&&<button className="pulse-all-readings" aria-controls={readingsId} disabled>Показать ещё</button>}
      </section>
    </div>
    <footer className="pulse-footer"><GlassControlScene className="pulse-discuss-scene"><GlassButton {...GLASS_PRESETS.navigation} size="icon" className="pulse-discuss" aria-label="Обсудить с помощником" disabled title="Вне сценария тестового"><Icon name="chat-fill"/></GlassButton></GlassControlScene></footer>
  </section>;
}
