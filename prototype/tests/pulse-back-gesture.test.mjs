import test from 'node:test';
import assert from 'node:assert/strict';
import {createPulseBackGesture} from '../src/pulse-back-gesture.js';

function harness({scale=1}={}){
  const listeners=()=>({handlers:new Map(),addEventListener(type,fn){this.handlers.set(type,fn);},removeEventListener(type){this.handlers.delete(type);}});
  const host={...listeners(),getComputedStyle:node=>({overflowX:node.overflowX||'visible'})};
  let time=0,starts=0;const values=[],finished=[],captures=new Set(),classes=new Set();
  const panel={...listeners(),clientWidth:402,closest:()=>null,getBoundingClientRect:()=>({width:402*scale}),
    contains(node){while(node){if(node===this)return true;node=node.parentElement;}return false;},
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
    hasPointerCapture:id=>captures.has(id),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id)};
  const node=(selector='',parentElement=panel,extra={})=>({parentElement,clientWidth:160,scrollWidth:160,...extra,
    closest(selectors){return selectors.split(',').includes(selector)?this:this.parentElement?.closest?.(selectors)||null;}});
  const card=node('.pulse-state-card');
  const controller=createPulseBackGesture({panel,host,now:()=>time,onStart:()=>{starts++;return 1;},onProgress:value=>values.push(value),onFinish:value=>finished.push(value)});
  function emit(type,{x=0,y=0,target=card,elapsed=16,count=1,pointerType='mouse',pointerId=1,...extra}={}){
    time+=elapsed;let prevented=false,stopped=false;
    const event={target,clientX:x,clientY:y,pointerType,pointerId,button:0,isPrimary:true,cancelable:true,
      touches:Array.from({length:count},(_,identifier)=>({identifier,clientX:x,clientY:y})),
      preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;},...extra};
    (panel.handlers.get(type)||host.handlers.get(type))?.(event);return {prevented,stopped};
  }
  return {panel,host,node,card,emit,values,finished,captures,classes,controller,get starts(){return starts;}};
}

test('right swipe follows the finger at each mockup scale and returns to widgets on release',()=>{
  for(const scale of [.5,1,1.8]){
    const h=harness({scale});h.emit('touchstart',{x:40*scale});
    assert.equal(h.emit('touchmove',{x:140*scale}).prevented,true);
    assert.ok(Math.abs(h.values.at(-1)-(1-100/402))<1e-8);
    assert.deepEqual(h.finished,[],'keep the detail mounted while dragging');
    h.emit('touchend');assert.deepEqual(h.finished,[true]);assert.equal(h.classes.size,0);h.controller.dispose();
  }
});
test('a short slow drag snaps back while a deliberate right flick goes back',()=>{
  for(const [elapsed,expected] of [[150,false],[16,true]]){
    const h=harness();h.emit('touchstart');h.emit('touchmove',{x:40,elapsed});h.emit('touchend');
    assert.deepEqual(h.finished,[expected]);h.controller.dispose();
  }
});
test('vertical scroll, left swipe and taps never take over or navigate',()=>{
  for(const point of [{x:0,y:90},{x:-90,y:0},{x:5,y:2}]){
    const h=harness();h.emit('touchstart');assert.equal(h.emit('touchmove',point).prevented,false);
    if(Math.abs(point.y)>10)assert.equal(h.emit('touchmove',{x:180,y:120}).prevented,false,'vertical gesture stays vertical');
    h.emit('touchend');assert.equal(h.starts,0);assert.deepEqual(h.finished,[]);h.controller.dispose();
  }
});
test('the whole first card, segmented control and horizontal scrollers retain their gestures',()=>{
  const h=harness();
  const targets=['.pulse-chart-card','.pulse-period','button','[role="slider"]'].map(selector=>h.node('span',h.node(selector)));
  for(const scrollLeft of [0,240])targets.push(h.node('span',h.node('.rail',h.panel,{scrollWidth:400,overflowX:'auto',scrollLeft})));
  for(const target of targets){h.emit('touchstart',{target});assert.equal(h.emit('touchmove',{target,x:160}).prevented,false);h.emit('touchend');}
  assert.equal(h.starts,0);assert.deepEqual(h.finished,[]);h.controller.dispose();
});
test('empty space, static cards, sparklines and measurement rows allow back swipes',()=>{
  for(const selector of ['', '.pulse-state-card','.pulse-duration-chart','.pulse-measurement-time']){
    const h=harness(),target=selector?h.node(selector):h.panel;
    h.emit('touchstart',{target});h.emit('touchmove',{target,x:120});h.emit('touchend');
    assert.deepEqual(h.finished,[true],selector);h.controller.dispose();
  }
});
test('cancel, second finger, resize and Escape restore pulse without leaving it',()=>{
  for(const ending of ['touchcancel','second-finger','resize','keydown']){
    const h=harness();h.emit('touchstart');h.emit('touchmove',{x:170});
    h.emit(ending==='second-finger'?'touchstart':ending,{count:2,key:'Escape'});
    h.emit('touchend');assert.deepEqual(h.finished,[false],ending);assert.equal(h.classes.size,0);h.controller.dispose();
  }
});
test('mouse dragging captures and releases the pointer, suppresses clicks and cleans up',()=>{
  const h=harness();h.emit('pointerdown');h.emit('pointermove',{x:120});assert.equal(h.captures.has(1),true);
  h.emit('pointerup');assert.deepEqual(h.finished,[true]);assert.equal(h.captures.size,0);
  assert.deepEqual(h.emit('click',{detail:1}),{prevented:true,stopped:true});
  assert.equal(h.emit('click',{detail:1,elapsed:500}).prevented,false);
  h.controller.dispose();assert.equal(h.panel.handlers.size,0);assert.equal(h.host.handlers.size,0);
});
test('touch pointer events do not duplicate touch gestures and a lost pointer cancels',()=>{
  const h=harness();h.emit('pointerdown',{pointerType:'touch'});h.emit('pointermove',{pointerType:'touch',x:160});assert.equal(h.starts,0);
  h.emit('pointerdown');h.emit('pointermove',{x:160});h.emit('lostpointercapture');
  assert.deepEqual(h.finished,[false]);assert.equal(h.captures.size,0);h.controller.dispose();
});
