import {useLayoutEffect,useRef,useState} from 'react';

// Shared by the home widgets and pulse detail. Every range owns its scale.
export function MetricRange({values,value,displayValues=values,displayValue=value,goal,horizontal=false,className='metric-range',label}){
  const ref=useRef(null),[length,setLength]=useState(96);
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(([entry])=>{
      const next=horizontal?entry.contentRect.width:entry.contentRect.height;
      if(next>32)setLength(next);
    });
    observer.observe(ref.current);
    return()=>observer.disconnect();
  },[horizontal]);
  const readings=values.filter(Number.isFinite),hasRange=readings.length>0;
  const low=Math.min(...readings),high=Math.max(...readings);
  const displayedReadings=displayValues.filter(Number.isFinite);
  const displayLow=Math.min(...displayedReadings),displayHigh=Math.max(...displayedReadings);
  // Observed prototype bounds, not clinical thresholds. Equal readings sit centrally.
  const position=displayValue===null||!hasRange||!displayedReadings.length?null:Math.min(1,Math.max(0,goal?displayValue/goal:displayHigh===displayLow?.5:(displayValue-displayLow)/(displayHigh-displayLow)));
  const trackLength=length-32,end=length-16;
  return <svg ref={ref} className={className} viewBox={horizontal?`0 0 ${length} 24`:`0 0 24 ${length}`} fill="none" aria-hidden={label?undefined:true} role={label?'img':undefined} aria-label={label} data-low={hasRange?low:undefined} data-high={hasRange?high:undefined} data-value={value??undefined}>
    <g transform={horizontal?`translate(${length} 0) rotate(90)`:undefined}>
      <rect width="24" height={length} rx="12" fill="#f3f6f5"/>
      <path d={`M9 7H15M9 ${length-7}H15`} stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".3"/>
      {hasRange&&<rect x="7" y="16" width="10" height={trackLength} rx="5" fill="currentColor" opacity={goal?'.18':'.9'}/>}
      {goal&&position>0&&<rect className="metric-range-progress" x="7" y={end-position*trackLength} width="10" height={position*trackLength} rx="5" fill="currentColor" opacity=".9"/>}
      {position!==null&&<circle className="metric-range-marker" cx="12" cy={end-position*trackLength} r="5" fill="currentColor" stroke="#fff" strokeWidth="2.5"/>}
    </g>
  </svg>;
}
