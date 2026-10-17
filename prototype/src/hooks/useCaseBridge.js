import {useEffect,useRef} from 'react';
import {flushSync} from 'react-dom';

const frames=(signal,count=2)=>new Promise((resolve,reject)=>{
  let id;const abort=()=>{cancelAnimationFrame(id);reject(signal.reason);};
  const tick=()=>{if(signal.aborted)return abort();if(--count<=0){signal.removeEventListener('abort',abort);resolve();}else id=requestAnimationFrame(tick);};
  signal.addEventListener('abort',abort,{once:true});id=requestAnimationFrame(tick);
});
export function useCaseBridge(actions){
  const latest=useRef(actions);latest.current=actions;
  useEffect(()=>{
    const bridge={
      async enter(state,signal){
        signal.throwIfAborted();flushSync(()=>latest.current.enter(state));
        await frames(signal,3);signal.throwIfAborted();
        document.querySelectorAll('[data-case-anchor]').forEach(el=>el.removeAttribute('data-case-anchor'));
        const anchors={chat:'.chat-panel',composer:'.chat-dock',mascot:state.startsWith('widgets')?'.widget-assistant':'.empty-chat',calendar:'.activity-history',metrics:'.health-bento',care:'.clinic-entry',appointments:'.medical-section[aria-label="Записи"]',chart:'.pulse-chart-card',period:'.pulse-period',summary:'.pulse-breakdown',discuss:'.pulse-discuss-scene',context:'.context-zone',conversation:'.conversation'};
        Object.entries(anchors).forEach(([name,selector])=>document.querySelector(selector)?.setAttribute('data-case-anchor',name));
        if(state.startsWith('pulse')){
          const period=state==='pulse-week'?'week':state==='pulse-month'?'month':'day';
          window.dispatchEvent(new CustomEvent('case:pulse',{detail:{period}}));
          await frames(signal,2);
        }
        const home=document.querySelector('.home-scroll'),pulse=document.querySelector('.pulse-detail-body');
        if(home)home.scrollTop=0;if(pulse)pulse.scrollTop=0;
        const target=state==='widgets-metrics'?document.querySelector('.health-bento'):state==='widgets-care'?document.querySelector('.clinic-entry'):state==='pulse-summary'?document.querySelector('.pulse-breakdown'):null;
        const scroll=state.startsWith('pulse')?pulse:home;
        if(target&&scroll){
          const scale=scroll.getBoundingClientRect().width/scroll.clientWidth;
          // The widget header overlays the scroll area; respect its existing safe inset.
          const scrollInset=parseFloat(getComputedStyle(scroll).scrollPaddingTop);
          const topInset=Number.isFinite(scrollInset)?scrollInset:110;
          scroll.scrollTop+=(target.getBoundingClientRect().top-scroll.getBoundingClientRect().top)/scale-topInset;
        }
        await frames(signal,2);signal.throwIfAborted();
        document.documentElement.dataset.caseState=state;
      },
      describe(){return{title:'Помощник по здоровью',body:['Чат, виджеты и пульс.']};}
    };
    window.caseBridge=bridge;
    return()=>{if(window.caseBridge===bridge)delete window.caseBridge;};
  },[]);
}
