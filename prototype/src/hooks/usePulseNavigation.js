import {useCallback,useEffect,useRef,useState} from 'react';

// One clock moves the incoming screen and its slower background. Keep the
// mounted detail through the return trip, including an interrupted entrance.
export function usePulseNavigation(deviceRef){
  const [detail,updateDetail]=useState(null);
  const progress=useRef(0),frame=useRef(null),complete=useRef(null);
  const paint=useCallback(value=>{
    progress.current=value;
    deviceRef.current?.style.setProperty('--pulse-navigation-progress',String(value));
  },[deviceRef]);
  const cancel=useCallback(()=>{
    cancelAnimationFrame(frame.current);frame.current=null;complete.current=null;
    delete deviceRef.current?.dataset.pulseTransitioning;
  },[deviceRef]);
  const setDetail=useCallback(item=>{
    cancel();paint(item?1:0);
    deviceRef.current?.classList.toggle('pulse-navigation-active',Boolean(item));
    updateDetail(item);
  },[cancel,paint,deviceRef]);
  const animate=useCallback((target,onComplete)=>{
    cancel();
    const finish=()=>{
      cancelAnimationFrame(frame.current);frame.current=null;
      paint(target);delete deviceRef.current?.dataset.pulseTransitioning;
      complete.current=null;onComplete?.();
    };
    complete.current=finish;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||progress.current===target)return finish();
    const from=progress.current,started=performance.now(),duration=420*Math.abs(target-from);
    deviceRef.current.dataset.pulseTransitioning='true';
    const tick=now=>{
      const elapsed=Math.min(1,Math.max(0,(now-started)/duration));
      paint(from+(target-from)*(1-(1-elapsed)**3));
      if(elapsed<1)frame.current=requestAnimationFrame(tick);else finish();
    };
    frame.current=requestAnimationFrame(tick);
  },[cancel,paint,deviceRef]);
  const open=useCallback(item=>{
    updateDetail(item);deviceRef.current?.classList.add('pulse-navigation-active');
    animate(1);
  },[animate,deviceRef]);
  const close=useCallback(onComplete=>animate(0,()=>{
    updateDetail(null);deviceRef.current?.classList.remove('pulse-navigation-active');
    onComplete?.();
  }),[animate,deviceRef]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed=()=>{if(media.matches)complete.current?.();};
    media.addEventListener('change',changed);
    return()=>{cancel();media.removeEventListener('change',changed);};
  },[cancel]);
  return {detail,setDetail,open,close};
}
