// The page and the full-width left drawer share one finger-controlled offset.
export function createHistoryGesture({device,surface,layer,drawer,onPrepare,onChange,onSettled}){
  const excluded='#metrics,.activity-history-track,input,textarea,select,[contenteditable="true"],.composer,.suggestions,.context-list';
  let open=false,gesture=null,settleTimer=null,suppressClickUntil=0;
  const width=()=>surface.clientWidth;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visualOffset=()=>new DOMMatrixReadOnly(getComputedStyle(surface).transform).m41;
  const write=offset=>device.style.setProperty('--history-offset',`${offset}px`);
  function prepare(){
    clearTimeout(settleTimer);
    if(layer.hidden){onPrepare();layer.hidden=false;}
  }
  function settled(){
    clearTimeout(settleTimer);
    layer.hidden=!open;
    onSettled(open);
  }
  function setOpen(next){
    const current=visualOffset();
    prepare();
    device.classList.add('history-dragging');write(current);
    // Keep the currently displayed position when reversing a settling animation.
    void surface.offsetWidth;
    device.classList.remove('history-dragging');
    open=next;
    surface.inert=open;drawer.inert=!open;
    layer.setAttribute('aria-hidden',String(!open));
    device.dataset.historyOpen=String(open);
    onChange(open);
    write(open?width():0);
    if(reduced()||Math.abs(current-(open?width():0))<.5)settled();
    else settleTimer=setTimeout(settled,330);
  }
  surface.addEventListener('transitionend',event=>{
    if(event.target===surface&&event.propertyName==='transform'&&!gesture)settled();
  });
  function start(event,x,y,pointerId=null){
    if(event.target.closest(excluded)||(!surface.contains(event.target)&&!drawer.contains(event.target)))return;
    const scale=device.getBoundingClientRect().width/device.offsetWidth;
    gesture={x,y,scale,pointerId,start:visualOffset(),offset:visualOffset(),wasOpen:open,active:false};
  }
  function move(event,x,y){
    if(!gesture)return;
    const dx=(x-gesture.x)/gesture.scale,dy=(y-gesture.y)/gesture.scale;
    if(!gesture.active){
      if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)){gesture=null;return;}
      if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25)return;
      if((gesture.start<1&&dx<0)||(gesture.start>width()-1&&dx>0)){gesture=null;return;}
      prepare();
      device.classList.add('history-dragging');
      gesture.active=true;
      document.activeElement?.blur();
      if(gesture.pointerId!==null)device.setPointerCapture(gesture.pointerId);
    }
    if(event.cancelable)event.preventDefault();
    gesture.offset=Math.max(0,Math.min(width(),gesture.start+dx));
    write(gesture.offset);
  }
  function end(cancelled=false){
    if(!gesture)return;
    const last=gesture;gesture=null;
    if(last.pointerId!==null&&device.hasPointerCapture(last.pointerId))device.releasePointerCapture(last.pointerId);
    if(!last.active)return;
    suppressClickUntil=performance.now()+400;
    const progress=last.offset/width();
    // A short pull returns to its starting state; completing 75% commits it.
    setOpen(cancelled?last.wasOpen:last.wasOpen?progress>.25:progress>=.75);
  }
  device.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){end(true);return;}
    const touch=event.touches[0];start(event,touch.clientX,touch.clientY);
  },{passive:true});
  device.addEventListener('touchmove',event=>{
    if(event.touches.length!==1){end(true);return;}
    const touch=event.touches[0];move(event,touch.clientX,touch.clientY);
  },{passive:false});
  device.addEventListener('touchend',()=>end(),{passive:true});
  device.addEventListener('touchcancel',()=>end(true),{passive:true});
  device.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'||event.button!==0)return;
    start(event,event.clientX,event.clientY,event.pointerId);
  });
  window.addEventListener('pointermove',event=>{
    if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)move(event,event.clientX,event.clientY);
  });
  window.addEventListener('pointerup',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)end();});
  window.addEventListener('pointercancel',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)end(true);});
  device.addEventListener('click',event=>{
    if(event.detail&&performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  // Keyboard access without adding a visible navigation button to the header.
  window.addEventListener('keydown',event=>{
    if(event.altKey&&event.key==='ArrowRight'){event.preventDefault();setOpen(true);}
    if(event.key==='Escape'&&gesture?.active){event.preventDefault();event.stopImmediatePropagation();end(true);}
  },true);
  window.addEventListener('resize',()=>{
    gesture=null;clearTimeout(settleTimer);
    device.classList.add('history-dragging');write(open?width():0);
    void surface.offsetWidth;device.classList.remove('history-dragging');settled();
  });
  return {setOpen};
}
