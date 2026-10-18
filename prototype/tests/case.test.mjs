import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {caseLayout,shell} from '../presentation/src/case-layout.mjs';
import {caseScrollGeometry,caseScrollPosition,resizeCaseScroll} from '../presentation/src/case-scroll.mjs';
import {createCaseTouchScroll,splitCopyScroll} from '../presentation/src/case-touch-scroll.mjs';
import {scenes,entries} from '../presentation/src/story.ts';
import {canOpenDetail} from '../src/case-scope.js';
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function touchHarness({max=0,top=0}={}){
 const listeners=new Map(),hostListeners=new Map(),frames=new Map();let time=0,id=0,active=true,currentScene=0,page=0;
 const copy={scrollTop:top,scrollHeight:200+max,clientHeight:200,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const host={addEventListener:(name,fn)=>hostListeners.set(name,fn),removeEventListener:name=>hostListeners.delete(name)};
 const controller=createCaseTouchScroll(copy,{enabled:()=>active,scene:()=>currentScene,scrollPage:delta=>{page+=delta;},host,now:()=>time,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id)});
 const touch=(name,y,{x=0,count=1,elapsed=16,cancelable=true}={})=>{
  time+=elapsed;let prevented=false;
  const touches=Array.from({length:count},(_,identifier)=>({identifier,clientX:x,clientY:y}));
  listeners.get(name)?.({touches,cancelable,preventDefault:()=>{prevented=true;}});return prevented;
 };
 return {copy,hostListeners,controller,touch,get page(){return page;},get pending(){return frames.size;},setActive:value=>{active=value;},nextScene:()=>{currentScene++;copy.scrollTop=0;},tick(ms=16){time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}};
}
test('copy scrolling hands unused distance to the page in either direction',()=>{
 assert.deepEqual(splitCopyScroll(80,170,200),{top:200,page:50});
 assert.deepEqual(splitCopyScroll(-80,30,200),{top:0,page:-50});
 assert.deepEqual(splitCopyScroll(80,0,0),{top:0,page:80});
});
test('a swipe over short mobile copy immediately scrolls the tour',()=>{
 const h=touchHarness();h.touch('touchstart',500);
 h.hostListeners.get('pointerdown')({pointerType:'touch'});
 assert.equal(h.touch('touchmove',420),true);assert.equal(h.page,80);
 assert.equal(h.copy.scrollTop,0);h.controller.dispose();
});
test('long copy finishes before the same gesture advances the tour, without relatching on the next scene',()=>{
 const h=touchHarness({max:200,top:100});h.touch('touchstart',500);
 h.touch('touchmove',450);assert.equal(h.copy.scrollTop,150);assert.equal(h.page,0);
 h.touch('touchmove',350);assert.equal(h.copy.scrollTop,200);assert.equal(h.page,50);
 h.nextScene();h.touch('touchmove',300);assert.equal(h.page,100);assert.equal(h.copy.scrollTop,0);
 h.controller.dispose();
});
test('reverse swipe reads back to the top before returning to an earlier scene',()=>{
 const h=touchHarness({max:200,top:30});h.touch('touchstart',300);h.touch('touchmove',380);
 assert.equal(h.copy.scrollTop,0);assert.equal(h.page,-50);h.controller.dispose();
});
test('taps, horizontal gestures, pinch, cancellation and inactive modes keep their native behavior',()=>{
 for(const scenario of ['tap','horizontal','pinch','cancel','disabled']){
  const h=touchHarness();if(scenario==='disabled')h.setActive(false);h.touch('touchstart',500);
  if(scenario==='cancel')h.touch('touchcancel',500);
  assert.equal(h.touch('touchmove',scenario==='tap'?498:scenario==='horizontal'?490:420,{x:scenario==='horizontal'?100:0,count:scenario==='pinch'?2:1}),false,scenario);
  assert.equal(h.page,0,scenario);h.touch('touchend',420);assert.equal(h.pending,0,scenario);h.controller.dispose();
 }
});
test('a held finger stops the tour, a flick glides, and a new gesture cancels its momentum',()=>{
 const held=touchHarness();held.touch('touchstart',500);held.touch('touchmove',420);held.touch('touchend',420,{elapsed:120});
 assert.equal(held.pending,0);held.controller.dispose();
 const flick=touchHarness();flick.touch('touchstart',500);flick.touch('touchmove',420);flick.touch('touchend',420);
 flick.tick();assert.ok(flick.page>80);const stopped=flick.page;flick.hostListeners.get('touchstart')();
 flick.tick();assert.equal(flick.page,stopped);assert.equal(flick.pending,0);flick.controller.dispose();
});
test('copy momentum stops when leaving the tour and cleans up every listener',()=>{
 const h=touchHarness();h.touch('touchstart',500);h.touch('touchmove',420);h.touch('touchend',420);h.setActive(false);h.tick();
 assert.equal(h.page,80);assert.equal(h.pending,0);h.controller.dispose();assert.equal(h.hostListeners.size,0);
});
test('mobile scrolling advances through every scene before reaching history',()=>{
 for(const [height,compact] of [[568,true],[844,true],[900,true],[900,false]]){
  const geometry=caseScrollGeometry(height,scenes.length,compact);
  assert.deepEqual(caseScrollPosition(height,geometry),{history:false,index:1},'one viewport must reach the second scene, not history');
  for(let index=0;index<scenes.length;index++){
   assert.deepEqual(caseScrollPosition(index*geometry.step,geometry),{history:false,index});
  }
  assert.equal(caseScrollPosition(geometry.historyStart-1,geometry).history,false);
  assert.deepEqual(caseScrollPosition(geometry.trackHeight,geometry),{history:true,index:scenes.length-1});
  assert.deepEqual(caseScrollPosition((scenes.length-1)*geometry.step,geometry),{history:false,index:scenes.length-1},'reverse scrolling restores the last scene');
 }
});
test('mobile browser bars do not resize the tour or issue scroll corrections in either direction',()=>{
 let viewport=resizeCaseScroll(null,390,844,scenes.length);
 const original=viewport.geometry;
 for(const offset of [100,900,1800,1200,300])for(const height of [844,800,740,780,844]){
  const scrollY=original.trackHeight+offset;
  viewport=resizeCaseScroll(viewport,390,height,scenes.length,scrollY);
  assert.equal(viewport.geometry,original,'history must stay at the same document offset');
  assert.equal(viewport.scrollTop,null,'a resize must not cancel native scroll momentum');
  assert.equal(caseScrollPosition(scrollY,viewport.geometry).history,true);
 }
 const tourY=6.2*original.step;
 viewport=resizeCaseScroll(viewport,390,740,scenes.length,tourY);
 assert.equal(viewport.scrollTop,null);
 assert.deepEqual(caseScrollPosition(tourY,viewport.geometry),{history:false,index:6});
});
test('rotation and desktop window resizing retain fractional progress within a scene',()=>{
 for(const [from,to] of [[[390,844],[844,390]],[[1440,900],[1440,768]],[[1024,768],[900,768]]]){
  const before=resizeCaseScroll(null,...from,scenes.length);
  const after=resizeCaseScroll(before,...to,scenes.length,6.2*before.geometry.step);
  assert.notEqual(after.scrollTop,null);
  assert.deepEqual(caseScrollPosition(after.scrollTop,after.geometry),{history:false,index:6});
  assert.ok(Math.abs(after.scrollTop/after.geometry.step-6.2)<1e-9);
 }
});
test('rotation preserves the reading offset in history and subsequent browser bar changes stay passive',()=>{
 const before=resizeCaseScroll(null,390,844,scenes.length);
 const after=resizeCaseScroll(before,844,390,scenes.length,before.geometry.trackHeight+800);
 assert.ok(Math.abs(after.scrollTop-after.geometry.trackHeight-800)<1e-9);
 const bars=resizeCaseScroll(after,844,340,scenes.length,after.scrollTop);
 assert.equal(bars.geometry,after.geometry);assert.equal(bars.scrollTop,null);
});
test('mobile history follows the final scene in normal vertical flow',()=>{
 for(const height of [568,740,844]){
  const geometry=caseScrollGeometry(height,scenes.length,true);
  const lastSceneTop=(scenes.length-1)*geometry.step;
  assert.equal(geometry.trackHeight,lastSceneTop+height,'the sticky tour releases at the last scene');
  assert.equal(geometry.historyStart,geometry.trackHeight,'history mode begins only after the tour has left the viewport');
  const halfway=lastSceneTop+height/2;
  assert.deepEqual(caseScrollPosition(halfway,geometry),{history:false,index:scenes.length-1});
  assert.equal(geometry.trackHeight-halfway,height/2,'history enters immediately below the final scene');
 }
});
test('phone and explanation remain separate at desktop, compact and small sizes',()=>{
 for(const [width,height] of [[1440,900],[1024,768],[700,900],[390,844],[320,568]])for(const compare of [false,true]){
  const l=caseLayout(width,height,{compare});
  assert.ok(!overlaps(l.device,l.text),`${width}x${height}, compare ${compare}`);
  assert.ok(l.device.x>=0&&l.device.x+l.device.width<=width);
  assert.ok(l.text.height>=100);
  if(compare)assert.ok(!overlaps(l.before,l.device));
 }
});
test('history phone is beyond the text column on wide screens',()=>{
 for(const width of [1024,1440,1920]){
  const l=caseLayout(width,900,{history:true});
  const textRight=Math.max(40,(width-1240)/2+35)+Math.min(600,width*.51);
  assert.ok(l.device.x>=textRight,`${width}: history overlaps phone`);
 }
});
test('entering and leaving comparison keeps the heading, copy and controls column fixed',()=>{
 for(const [width,height] of [[1920,1080],[1440,900],[1057,898],[1000,650],[700,900],[390,844]]){
  const single=caseLayout(width,height),comparison=caseLayout(width,height,{compare:true});
  assert.deepEqual(comparison.text,single.text,`${width}x${height}: reading column shifts`);
  if(!comparison.compact)assert.ok(comparison.device.x+comparison.device.width<=comparison.text.x-31.99,`${width}: comparison crowds text`);
 }
});
test('mockup preserves the catalog screen rectangle',()=>{
 assert.equal(shell.screenWidth,402);
 assert.ok(Math.abs(shell.screenHeight-874.18)<.1);
 assert.notEqual(shell.x,shell.y);
});
test('only the pulse detail belongs to this assignment',()=>{
 assert.equal(canOpenDetail({id:'pulse',kind:'metric'}),true);
 for(const item of [{id:'sleep',kind:'metric'},{id:'oxygen',kind:'metric'},{id:'steps',kind:'metric'},{id:'pulse',kind:'file'},{id:'labs',kind:'care'},null])assert.equal(canOpenDetail(item),false);
});
test('every story image exists and the tour contains only scoped states',()=>{
 assert.equal(new Set(scenes.map(s=>s.id)).size,scenes.length);
 assert.equal(new Set(entries.map(s=>s.id)).size,entries.length);
 for(const scene of scenes)assert.match(scene.state,/^(chat|widgets|pulse|notification)/);
 const images=[...entries.flatMap(e=>e.images||[]),...scenes.flatMap(e=>e.compare?[e.compare]:[])];
 for(const image of images)assert.ok(existsSync(fileURLToPath(new URL('../'+image.src,import.meta.url))),image.src);
});
