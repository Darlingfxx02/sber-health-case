// Ordered destinations: history (0), chat (1), widgets (2).
export function swipeDestination({page,delta,width,velocity=0,cancelled=false}){
  if(cancelled||!width)return page;
  const distance=Math.abs(delta),direction=delta<0?1:-1;
  const far=distance>=width*.22;
  const flick=distance>=28&&Math.abs(velocity)>=.45&&Math.sign(velocity)===Math.sign(delta);
  return far||flick?Math.max(0,Math.min(2,page+direction)):page;
}
export function navigationOffsets(position,width){
  return {history:Math.max(0,1-position)*width,view:-Math.max(0,position-1)*width};
}

export function createHistoryGesture({device,surface,track,layer,drawer,onPrepare,onChange,onView,onSettled,isBlocked=()=>false,initialView='chat',allowHistory=true}){
  const lifetime=new AbortController();
  const listen=(target,event,handler,options={})=>target.addEventListener(event,handler,{...options,signal:lifetime.signal});
  const excluded='.view-switch,.activity-history-track,.appointment-grid,input,textarea,select,[contenteditable="true"],.composer,.suggestions,.context-list';
  let page=initialView==='widgets'?2:1,gesture=null,settleTimer=null,suppressClickUntil=0;
  const width=()=>surface.clientWidth;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offset=element=>new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
  const visualPosition=()=>1-offset(surface)/width()-offset(track)/width();
  function write(position){
    const value=navigationOffsets(position,width());
    device.style.setProperty('--history-offset',`${value.history}px`);
    device.style.setProperty('--view-offset',`${value.view}px`);
  }
  function prepare(revealHistory){
    clearTimeout(settleTimer);
    if(revealHistory&&layer.hidden){onPrepare();layer.hidden=false;}
  }
  function settled(){
    clearTimeout(settleTimer);
    layer.hidden=page!==0;
    device.classList.remove('navigation-settling');
    onSettled(page===0);
  }
  function releasePointer(last){
    if(last?.pointerId!=null&&device.hasPointerCapture(last.pointerId))device.releasePointerCapture(last.pointerId);
  }
  function goTo(next){
    next=Math.max(allowHistory?0:1,Math.min(2,next));
    releasePointer(gesture);gesture=null;
    const current=visualPosition();
    prepare(next===0||current<1);
    device.classList.add('history-dragging');write(current);
    // Reversing a transition starts at the currently displayed position.
    void surface.offsetWidth;
    device.classList.remove('history-dragging');
    device.classList.add('navigation-settling');
    page=next;
    surface.inert=page===0;drawer.inert=page!==0;
    layer.setAttribute('aria-hidden',String(page!==0));
    device.dataset.historyOpen=String(page===0);
    device.dataset.navigationPage=['history','chat','widgets'][page];
    onChange(page===0);onView(page===2?'widgets':'chat');
    write(page);
    if(reduced()||Math.abs(current-page)<.001)settled();
    else settleTimer=setTimeout(settled,320);
  }
  function start(event,x,y,pointerId=null){
    if(gesture||isBlocked()||event.target.closest(excluded)||(!surface.contains(event.target)&&!drawer.contains(event.target)))return;
    const scale=device.getBoundingClientRect().width/device.offsetWidth;
    const now=performance.now();
    gesture={x,y,scale,pointerId,start:visualPosition(),page,position:visualPosition(),active:false,delta:0,samples:[{x,time:now}]};
  }
  function move(event,x,y){
    if(!gesture)return;
    const dx=(x-gesture.x)/gesture.scale,dy=(y-gesture.y)/gesture.scale;
    if(!gesture.active){
      if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)){gesture=null;return;}
      if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25)return;
      if((gesture.page===(allowHistory?0:1)&&dx>0)||(gesture.page===2&&dx<0)){gesture=null;return;}
      prepare(gesture.page===0||(gesture.page===1&&dx>0));
      device.classList.remove('navigation-settling');
      device.classList.add('history-dragging');
      gesture.active=true;
      document.activeElement?.blur();
      if(gesture.pointerId!==null)device.setPointerCapture(gesture.pointerId);
    }
    if(event.cancelable)event.preventDefault();
    gesture.delta=dx;
    gesture.position=Math.max(Math.max(allowHistory?0:1,gesture.page-1),Math.min(Math.min(2,gesture.page+1),gesture.start-dx/width()));
    const now=performance.now();
    gesture.samples.push({x,time:now});
    gesture.samples=gesture.samples.filter(sample=>now-sample.time<=100);
    write(gesture.position);
  }
  function end(cancelled=false){
    if(!gesture)return;
    const last=gesture;gesture=null;
    releasePointer(last);
    if(!last.active)return;
    suppressClickUntil=performance.now()+400;
    const first=last.samples[0],final=last.samples.at(-1),elapsed=Math.max(1,performance.now()-first.time);
    const velocity=(final.x-first.x)/last.scale/elapsed;
    goTo(swipeDestination({page:last.page,delta:last.delta,width:width(),velocity,cancelled}));
  }
  listen(device,'touchstart',event=>{
    if(event.touches.length!==1){end(true);return;}
    const touch=event.touches[0];start(event,touch.clientX,touch.clientY);
  },{passive:true});
  listen(device,'touchmove',event=>{
    if(event.touches.length!==1){end(true);return;}
    const touch=event.touches[0];move(event,touch.clientX,touch.clientY);
  },{passive:false});
  listen(device,'touchend',()=>end(),{passive:true});
  listen(device,'touchcancel',()=>end(true),{passive:true});
  listen(device,'pointerdown',event=>{
    if(event.pointerType==='touch'||event.button!==0)return;
    start(event,event.clientX,event.clientY,event.pointerId);
  });
  listen(window,'pointermove',event=>{
    if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)move(event,event.clientX,event.clientY);
  });
  listen(window,'pointerup',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)end();});
  listen(window,'pointercancel',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)end(true);});
  listen(device,'click',event=>{
    if(event.detail&&performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },{capture:true});
  listen(window,'keydown',event=>{
    if(isBlocked())return;
    if(event.altKey&&['ArrowRight','ArrowLeft'].includes(event.key)){
      event.preventDefault();goTo(Math.max(0,Math.min(2,page+(event.key==='ArrowLeft'?1:-1))));
    }
    if(event.key==='Escape'&&gesture?.active){event.preventDefault();event.stopImmediatePropagation();end(true);}
  },{capture:true});
  listen(window,'resize',()=>{
    releasePointer(gesture);gesture=null;clearTimeout(settleTimer);
    device.classList.add('history-dragging');write(page);
    void surface.offsetWidth;device.classList.remove('history-dragging');settled();
  });
  device.dataset.navigationPage=page===2?'widgets':'chat';
  write(page);
  return {setOpen:open=>goTo(open?0:1),setView:view=>goTo(view==='widgets'?2:1),
    demoSwipe(view){
      const rect=surface.getBoundingClientRect(),direction=view==='widgets'?-1:1;
      const x=rect.left+rect.width*(direction<0?.8:.2),y=rect.top+rect.height*.5;
      const event={target:surface,cancelable:false};start(event,x,y);
      return {update(progress){move(event,x+direction*rect.width*.6*progress,y);},finish(){end();},cancel(){end(true);},from:{x,y},distance:direction*rect.width*.6};
    },
    dispose(){lifetime.abort();clearTimeout(settleTimer);releasePointer(gesture);gesture=null;}};
}
