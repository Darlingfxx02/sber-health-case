import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoClock} from '../presentation/src/demo-clock.mjs';

function harness(paused=false){
  let time=0,id=0;const frames=new Map(),abort=new AbortController(),changes=[];
  const host={document:{hidden:false},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
  const clock=createDemoClock({signal:abort.signal,host,paused,onPause:value=>changes.push(value)});
  return {clock,host,abort,changes,frames,tick(ms=20){time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}};
}
test('pausing freezes app and gesture progress on the shared clock and resumes from the same point',async()=>{
  const h=harness(),values=[];const work=h.clock.animate(100,p=>values.push(p));h.tick();h.tick();h.tick();
  assert.equal(values.at(-1),.4);h.clock.toggle();h.tick(500);h.tick(500);assert.equal(values.at(-1),.4);
  h.clock.toggle();h.tick();assert.equal(values.at(-1),.6);h.tick();h.tick();await work;assert.equal(values.at(-1),1);
  assert.deepEqual(h.changes,[true,false]);assert.equal(h.frames.size,0);
});
test('background tabs and initially reduced-motion playback do not advance',async()=>{
  const h=harness(true),values=[];const work=h.clock.animate(40,p=>values.push(p));h.tick();h.tick();assert.equal(values.at(-1),0);
  h.clock.toggle();h.host.document.hidden=true;h.tick(1000);assert.equal(values.at(-1),0);
  h.host.document.hidden=false;h.tick();h.tick();await work;assert.equal(values.at(-1),1);
});
test('leaving, replaying or exploring aborts the clock and removes pending frames',async()=>{
  const h=harness();const work=h.clock.animate(1000,()=>{});h.tick();h.abort.abort();
  await assert.rejects(work,{name:'AbortError'});assert.equal(h.frames.size,0);
  await assert.rejects(h.clock.animate(1000,()=>{}),{name:'AbortError'});
});
