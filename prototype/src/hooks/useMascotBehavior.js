import {useEffect,useRef,useState} from 'react';
import {gazeAt,IDLE_POSES} from '../mascot-behavior.js';
import {logMascotEvent} from '../mascot-events.js';

export function useMascotBehavior({active=true,surface,cue,contextKey='',emotion}){
  const ref=useRef(null),[available,setAvailable]=useState(false),[reduced,setReduced]=useState(false);
  const [pose,setPose]=useState(IDLE_POSES[0]),[blink,setBlink]=useState(false),[greeting,setGreeting]=useState(0);
  const lastGreeting=useRef(0),nudged=useRef(new Map()),handledGreeting=useRef(0);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');let intersecting=false;
    const sync=()=>{setReduced(media.matches);setAvailable(intersecting&&!document.hidden);};
    const observer=new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting&&entries[0].intersectionRatio>=.3;sync();},{threshold:.3});
    observer.observe(ref.current);media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
    return()=>{observer.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);};
  },[]);
  const live=active&&available;
  const cueEmotion=cue?.emotion,cueTarget=cue?.target,cueReason=cue?.reason;
  useEffect(()=>{
    if(!live){setBlink(false);setPose(IDLE_POSES[0]);return;}
    const timers=new Set();let highlighted=null;
    const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);};
    const clearTarget=()=>{highlighted?.removeAttribute('data-mascot-cue');highlighted=null;};
    const show=(next)=>{
      setPose(next);
      logMascotEvent({surface,action:'emotion',emotion:next.emotion,reason:next.reason||'state',...(next.target?{target:next.target}:{})});
    };
    const idle=(index=0)=>{const next=IDLE_POSES[index%IDLE_POSES.length];show(next);later(()=>idle(index+1),next.duration);};
    const startBlink=()=>{
      later(()=>{setBlink(true);logMascotEvent({surface,action:'blink'});later(()=>{setBlink(false);startBlink();},150);},3600+Math.random()*2100);
    };
    const nudge=()=>{
      const target=ref.current.closest('.widget-panel')?.querySelector(`[data-mascot-target="${cueTarget}"]`);
      if(!target){idle();return;}
      const direction=gazeAt(ref.current.getBoundingClientRect(),target.getBoundingClientRect());
      highlighted=target;target.setAttribute('data-mascot-cue','true');nudged.current.set(contextKey,Date.now());
      const look={emotion:'encouraging',...direction,reason:'nudge',target:cueTarget};
      logMascotEvent({surface,action:'nudge',target:cueTarget,reason:cueReason});
      show(look);later(()=>show({emotion:'curious',x:0,y:-1,reason:'check-in'}),850);
      later(()=>show(look),1350);later(()=>{clearTarget();show({emotion:'happy',x:0,y:0,reason:'encourage'});},2400);
      later(()=>idle(),3900);
    };
    if(reduced){show({emotion:emotion||((cueEmotion==='encouraging')?'neutral':cueEmotion)||'neutral',x:0,y:0,reason:'reduced-motion'});}
    else if(emotion){show({emotion,x:0,y:0,reason:'voice-state'});startBlink();}
    else{
      startBlink();
      if(greeting!==handledGreeting.current){handledGreeting.current=greeting;show({emotion:'happy',x:0,y:-1,reason:'greeting'});later(()=>idle(),1400);}
      else if(cueTarget&&Date.now()-(nudged.current.get(contextKey)||0)>45000){show(IDLE_POSES[0]);later(nudge,2200);}
      else if(cueEmotion&&cueEmotion!=='neutral'&&cueEmotion!=='encouraging'){
        show({emotion:cueEmotion,x:0,y:cueEmotion==='thoughtful'?-2:0,reason:cueReason});later(()=>idle(),2800);
      }else idle();
    }
    return()=>{timers.forEach(clearTimeout);clearTarget();setBlink(false);};
  },[live,reduced,surface,cueEmotion,cueTarget,cueReason,contextKey,emotion,greeting]);
  function greet(){
    if(!live||reduced||Date.now()-lastGreeting.current<6000)return;
    lastGreeting.current=Date.now();setGreeting(value=>value+1);
  }
  return {ref,pose,blink,live,reduced,greet};
}
