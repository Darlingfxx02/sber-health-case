import {swipeDestination} from '../history-gesture.js';

// The first card owns chart inspection. Controls and horizontal scrollers keep
// their own gestures even when the scroller is already at either end.
function canStart(target,panel,host){
  if(!panel.contains(target)||target.closest('.pulse-chart-card,.pulse-period,button,a,input,textarea,select,[contenteditable="true"],[role="slider"],[data-swipe-back="ignore"]'))return false;
  for(let node=target;node&&node!==panel;node=node.parentElement){
    if(node.scrollWidth>node.clientWidth+2&&/auto|scroll/.test(host.getComputedStyle(node).overflowX))return false;
  }
  return true;
}

export function createPulseBackGesture({panel,onStart,onProgress,onFinish,host=panel.ownerDocument.defaultView,now=()=>performance.now()}){
  const remove=[];
  const listen=(target,type,handler,options)=>{
    target.addEventListener(type,handler,options);
    remove.push(()=>target.removeEventListener(type,handler,options));
  };
  let gesture=null,suppressClickUntil=0;
  function release(last){
    if(last?.pointerId!=null&&panel.hasPointerCapture(last.pointerId))panel.releasePointerCapture(last.pointerId);
    panel.classList.remove('pulse-back-dragging');
  }
  function start(event,x,y,pointerId=null){
    if(gesture||!canStart(event.target,panel,host))return;
    const width=panel.clientWidth,scale=panel.getBoundingClientRect().width/width;
    if(!width||!scale)return;
    gesture={x,y,width,scale,pointerId,active:false,delta:0,samples:[{x,time:now()}]};
  }
  function move(event,x,y){
    if(!gesture)return;
    const dx=(x-gesture.x)/gesture.scale,dy=(y-gesture.y)/gesture.scale;
    if(!gesture.active){
      if((Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx))||dx < -10){gesture=null;return;}
      if(dx<10||dx<Math.abs(dy)*1.25)return;
      gesture.start=onStart();gesture.active=true;
      panel.classList.add('pulse-back-dragging');
      if(gesture.pointerId!=null)panel.setPointerCapture(gesture.pointerId);
    }
    if(event.cancelable)event.preventDefault();
    gesture.delta=Math.max(0,dx);
    const time=now();
    gesture.samples.push({x,time});
    gesture.samples=gesture.samples.filter(sample=>time-sample.time<=100);
    onProgress(Math.max(0,Math.min(1,gesture.start-gesture.delta/gesture.width)));
  }
  function end(cancelled=false){
    if(!gesture)return;
    const last=gesture;gesture=null;release(last);
    if(!last.active)return;
    suppressClickUntil=now()+400;
    const first=last.samples[0],final=last.samples.at(-1);
    const velocity=(final.x-first.x)/last.scale/Math.max(1,now()-first.time);
    onFinish(swipeDestination({page:1,delta:last.delta,width:last.width,velocity,cancelled})===0);
  }
  listen(panel,'touchstart',event=>{
    if(event.touches.length!==1){end(true);return;}
    const touch=event.touches[0];start(event,touch.clientX,touch.clientY);
  },{passive:true});
  listen(panel,'touchmove',event=>{
    if(event.touches.length!==1){end(true);return;}
    const touch=event.touches[0];move(event,touch.clientX,touch.clientY);
  },{passive:false});
  listen(panel,'touchend',()=>end(),{passive:true});
  listen(panel,'touchcancel',()=>end(true),{passive:true});
  listen(panel,'pointerdown',event=>{
    if(event.pointerType==='touch'||event.button!==0||event.isPrimary===false)return;
    start(event,event.clientX,event.clientY,event.pointerId);
  });
  listen(host,'pointermove',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)move(event,event.clientX,event.clientY);});
  listen(host,'pointerup',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)end();});
  listen(host,'pointercancel',event=>{if(event.pointerType!=='touch'&&event.pointerId===gesture?.pointerId)end(true);});
  listen(panel,'lostpointercapture',event=>{if(event.pointerId===gesture?.pointerId)end(true);});
  listen(panel,'click',event=>{
    if(event.detail&&now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  listen(host,'keydown',event=>{
    if(event.key==='Escape'&&gesture?.active){event.preventDefault();event.stopImmediatePropagation();end(true);}
  },true);
  listen(host,'resize',()=>end(true));
  listen(host,'blur',()=>end(true));
  return {dispose(){remove.forEach(fn=>fn());release(gesture);gesture=null;}};
}
