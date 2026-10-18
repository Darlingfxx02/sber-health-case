import {flushSync} from 'react-dom';

// The app owns interactions; the presentation only supplies a cancellable clock
// and a visual touch renderer. These are the same navigation paths as real input.
export async function performCaseDemoAction(action,{signal,animate,draw,actions}){
  const find=selector=>{
    signal.throwIfAborted();const el=document.querySelector(selector);
    if(!el)throw Error(`Не найден элемент демонстрации: ${selector}`);return el;
  };
  const smooth=t=>t*t*(3-2*t);
  const pause=duration=>animate(duration,()=>{});
  async function tap(element){
    const box=element.getBoundingClientRect();let clicked=false;
    await animate(560,p=>{
      draw({kind:'tap',x:box.x+box.width/2,y:box.y+box.height/2,progress:p});
      if(p>=.45&&!clicked){clicked=true;flushSync(()=>element.click());}
    });draw(null);await pause(650);
  }
  if(action==='widgets'||action==='chat'){
    const swipe=actions.swipeView(action);
    try{
      await animate(1050,p=>{
        const progress=smooth(p);swipe.update(progress);
        draw({kind:'swipe',x:swipe.from.x+swipe.distance*progress,y:swipe.from.y,progress:p});
      });swipe.finish();
    }catch(error){swipe.cancel();throw error;}finally{draw(null);}
    await pause(700);return;
  }
  if(action==='dates'){
    const rail=find('.activity-history-track'),box=rail.getBoundingClientRect(),from=rail.scrollLeft;
    const snap=rail.style.scrollSnapType,behavior=rail.style.scrollBehavior;
    rail.style.scrollSnapType='none';rail.style.scrollBehavior='auto';
    try{await animate(1100,p=>{
      const progress=smooth(p);rail.scrollLeft=from*(1-progress);
      draw({kind:'swipe',x:box.x+box.width*.3+from*progress,y:box.y+box.height*.65,progress:p});
    });}finally{rail.style.scrollSnapType=snap;rail.style.scrollBehavior=behavior;draw(null);}
    await pause(350);return;
  }
  if(action==='previous-day'){
    const selected=find('.activity-ring-day[aria-pressed="true"]');
    await tap(selected.previousElementSibling||selected);return;
  }
  if(action==='pulse'){
    const tile=find('.pulse-tile'),scroll=find('.home-scroll');
    const box=tile.getBoundingClientRect(),bounds=scroll.getBoundingClientRect(),from=scroll.scrollTop;
    const distance=Math.max(0,box.bottom-(bounds.bottom-48));
    if(distance>0){
      try{await animate(700,p=>{scroll.scrollTop=from+distance*smooth(p);draw({kind:'swipe',x:bounds.x+bounds.width*.7,y:bounds.bottom-90-distance*smooth(p),progress:p});});}finally{draw(null);}
      await pause(250);
    }
    await tap(tile);return;
  }
  if(action==='back'){
    const panel=find('.pulse-panel'),box=panel.getBoundingClientRect(),start=actions.backSwipe.start();
    try{
      await animate(1050,p=>{
        const progress=smooth(p);actions.backSwipe.move(Math.max(0,start-.6*progress));
        draw({kind:'swipe',x:box.x+box.width*(.2+.6*progress),y:box.y+box.height*.65,progress:p});
      });actions.closeDetail();
    }catch(error){actions.backSwipe.cancel();throw error;}finally{draw(null);}
    await pause(650);return;
  }
  const label={day:'День',week:'Неделя',month:'Месяц',year:'Год'}[action];
  const period=[...find('.pulse-period').querySelectorAll('button')].find(button=>button.textContent===label);
  if(!period)throw Error(`Неизвестное действие демонстрации: ${action}`);
  await tap(period);
}
