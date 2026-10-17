import {useLayoutEffect,useRef,useState} from 'react';

// One interpolated reading drives both the number and its range marker.
export function useAnimatedReading(value,animate=true){
  const target=Number.isFinite(value)?value:null;
  const current=useRef(target),[reading,setReading]=useState(target);
  useLayoutEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const paint=next=>{current.current=next;setReading(next);};
    const finish=()=>{cancelAnimationFrame(frame);paint(target);};
    const onPreferenceChange=()=>{if(media.matches)finish();};
    media.addEventListener('change',onPreferenceChange);
    const from=current.current;
    if(!animate||media.matches||from===null||target===null||from===target){
      finish();
    }else{
      const started=performance.now(),duration=420;
      const tick=now=>{
        const progress=Math.min(1,Math.max(0,(now-started)/duration));
        const eased=1-(1-progress)**3;
        paint(progress===1?target:from+(target-from)*eased);
        if(progress<1)frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    }
    return()=>{
      cancelAnimationFrame(frame);
      media.removeEventListener('change',onPreferenceChange);
    };
  },[target,animate]);
  // Missing observations never count down to zero or reuse another day's value.
  return target===null?null:reading;
}
