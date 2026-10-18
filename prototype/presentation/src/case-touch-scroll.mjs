// A mobile browser can latch a whole gesture to the copy's nested scroller.
// Consume readable copy first, then hand the remaining distance to the tour.
export function splitCopyScroll(delta,top,max){
 const before=Math.max(0,Math.min(max,top));
 const next=Math.max(0,Math.min(max,before+delta));
 return {top:next,page:delta-(next-before)};
}

export function createCaseTouchScroll(copy,{enabled,scene,scrollPage,
 host=window,now=()=>performance.now(),requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame}){
 let gesture=null,frame=0;
 const cancel=()=>{cancelFrame(frame);frame=0;gesture=null;};
 function moveBy(delta,state){
  if(scene()!==state.scene)state.pageOnly=true;
  if(!state.pageOnly){
   const next=splitCopyScroll(delta,copy.scrollTop,Math.max(0,copy.scrollHeight-copy.clientHeight));
   copy.scrollTop=next.top;delta=next.page;
  }
  if(Math.abs(delta)>.01){state.pageOnly=true;scrollPage(delta);}
 }
 function start(event){
  cancel();
  if(!enabled()||event.touches.length!==1)return;
  const touch=event.touches[0];
  gesture={id:touch.identifier,x:touch.clientX,y:touch.clientY,lastY:touch.clientY,time:now(),velocity:0,vertical:false,pageOnly:false,scene:scene()};
 }
 function move(event){
  if(!gesture)return;
  if(!enabled()||event.touches.length!==1){cancel();return;}
  const touch=event.touches[0],state=gesture;
  if(touch.identifier!==state.id){cancel();return;}
  if(!state.vertical){
   const dx=touch.clientX-state.x,dy=touch.clientY-state.y;
   if(Math.max(Math.abs(dx),Math.abs(dy))<4)return;
   if(Math.abs(dx)>Math.abs(dy)){cancel();return;}
   state.vertical=true;
  }
  if(!event.cancelable){cancel();return;}
  event.preventDefault();
  const time=now(),delta=state.lastY-touch.clientY,elapsed=Math.max(8,time-state.time);
  state.velocity=Math.max(-2.5,Math.min(2.5,delta/elapsed));state.time=time;state.lastY=touch.clientY;
  moveBy(delta,state);
 }
 function end(){
  const state=gesture;gesture=null;
  // A held finger stops motion. A flick retains a short, bounded glide.
  if(!state?.vertical||!enabled()||now()-state.time>80||Math.abs(state.velocity)<.08)return;
  const started=now();let previous=started,velocity=state.velocity;
  const tick=time=>{
   if(!enabled()||time-started>550||Math.abs(velocity)<.03){frame=0;return;}
   const elapsed=Math.min(32,Math.max(0,time-previous));previous=time;
   moveBy(velocity*elapsed,state);velocity*=Math.exp(-elapsed/180);
   frame=requestFrame(tick);
  };
  frame=requestFrame(tick);
 }
 // A new gesture anywhere stops the old glide, including on arrows or the phone.
 const mouseDown=event=>{if(event.pointerType==='mouse')cancel();};
 host.addEventListener('touchstart',cancel,{passive:true,capture:true});
 host.addEventListener('pointerdown',mouseDown,{passive:true,capture:true});
 host.addEventListener('wheel',cancel,{passive:true});
 copy.addEventListener('touchstart',start,{passive:true});
 copy.addEventListener('touchmove',move,{passive:false});
 copy.addEventListener('touchend',end,{passive:true});
 copy.addEventListener('touchcancel',cancel,{passive:true});
 return {cancel,dispose(){
  cancel();host.removeEventListener('touchstart',cancel,true);host.removeEventListener('pointerdown',mouseDown,true);host.removeEventListener('wheel',cancel);
  copy.removeEventListener('touchstart',start);copy.removeEventListener('touchmove',move);copy.removeEventListener('touchend',end);copy.removeEventListener('touchcancel',cancel);
 }};
}
