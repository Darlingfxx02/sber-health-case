import {defaultEffects} from './vendor/portfolio-motion.js';
import {createDemoClock} from './demo-clock.mjs';

export const demoSteps=[
  ['widgets','Свайп влево — открываем виджеты'],
  ['dates','Листаем историю активности'],
  ['previous-day','Выбираем другой день'],
  ['pulse','Открываем пульс'],
  ['week','Смотрим неделю'],
  ['month','Смотрим месяц'],
  ['year','Смотрим год'],
  ['day','Возвращаемся к измерениям за день'],
  ['back','Свайп вправо — обратно к виджетам'],
  ['chat','Ещё один свайп — возвращаемся в чат']
] as const;

export function playInteractionDemo({frame,screen,controls,signal}: {frame:HTMLIFrameElement;screen:HTMLElement;controls:HTMLElement;signal:AbortSignal}){
  const layer=document.createElement('div');layer.className='demo-gesture-layer';layer.setAttribute('aria-hidden','true');screen.append(layer);
  const touchScale=1.6;
  Object.assign(layer.style,{width:`${100/touchScale}%`,height:`${100/touchScale}%`,transform:`scale(${touchScale})`,transformOrigin:'0 0'});
  const toggle=controls.querySelector<HTMLButtonElement>('[data-demo-toggle]')!,status=controls.querySelector<HTMLElement>('[data-demo-status]')!;
  let effect:any=null,kind='';
  const clear=()=>{effect?.dispose();effect=null;kind='';};
  const draw=(value:any)=>{
    if(!value){clear();return;}
    if(kind!==value.kind){clear();kind=value.kind;effect=defaultEffects.gesture(layer,kind,'#008cff');}
    effect.update({...value,x:value.x/touchScale,y:value.y/touchScale});
  };
  const paintPause=(paused:boolean)=>{toggle.textContent=paused?'Продолжить':'Пауза';toggle.setAttribute('aria-pressed',String(paused));};
  const clock=createDemoClock({signal,paused:matchMedia('(prefers-reduced-motion: reduce)').matches,onPause:paintPause});
  paintPause(clock.paused);toggle.disabled=false;
  toggle.onclick=()=>clock.toggle();
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{if(media.matches&&!clock.paused)clock.toggle();};media.addEventListener('change',changed);
  return (async()=>{
    try{
      let cycle=0;
      while(!signal.aborted){
        if(cycle)await (frame.contentWindow as any).caseBridge.enter('chat',signal);
        controls.dataset.cycle=String(++cycle);controls.dataset.step='intro';status.textContent='Начинаем с чата';await clock.animate(900,()=>{});
        for(const [action,label] of demoSteps){
          signal.throwIfAborted();status.textContent=label;controls.dataset.step=action;
          await (frame.contentWindow as any).caseBridge.demo(action,{signal,animate:clock.animate,draw});
        }
        status.textContent='Вернулись в чат — повторяем маршрут';controls.dataset.step='complete';await clock.animate(1200,()=>{});
      }
    }finally{clear();layer.remove();toggle.onclick=null;media.removeEventListener('change',changed);}
  })();
}
