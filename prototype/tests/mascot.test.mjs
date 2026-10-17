import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {mascotCue,gazeAt} from '../src/mascot-behavior.js';
import {validateMascotEvents,writeMascotEvents} from '../mascot-event-log.mjs';
import {ACTIVITY_DAYS} from '../src/data.js';

test('latest demo day points at the least complete recorded activity',()=>{
  assert.deepEqual(mascotCue(ACTIVITY_DAYS[0],ACTIVITY_DAYS[0].id),{emotion:'encouraging',reason:'activity-progress',target:'distance'});
  assert.equal(mascotCue({id:'today',progress:[15,40,10]},'today').target,'movement');
});
test('missing data, nutrition and old low days do not prompt catch-up',()=>{
  for(const progress of [[0,0,0],[0,0,15],[80,100,5],[NaN,undefined,5]])assert.equal(mascotCue({id:'today',progress},'today').target,undefined);
  assert.equal(mascotCue(ACTIVITY_DAYS[3],ACTIVITY_DAYS[0].id).emotion,'thoughtful');
  assert.equal(mascotCue(null,'today').target,undefined);
});
test('completed days get a celebration, including history',()=>{
  assert.equal(mascotCue(ACTIVITY_DAYS[1],ACTIVITY_DAYS[0].id).emotion,'happy');
});
test('gaze follows target geometry at any device scale',()=>{
  const from={left:100,top:100,width:100,height:50},to={left:230,top:220,width:40,height:20};
  const scale=rect=>Object.fromEntries(Object.entries(rect).map(([key,value])=>[key,value*.6]));
  const gaze=gazeAt(from,to);
  assert.deepEqual(gaze,gazeAt(scale(from),scale(to)));
  assert.ok(gaze.x>0&&gaze.y>0&&gaze.x<=10&&gaze.y<=7);
  assert.deepEqual(gazeAt(from,from),{x:0,y:0});
});
test('event log strips arbitrary data and rejects invalid actions or unbounded batches',()=>{
  const event={at:'2026-10-17T12:00:00Z',surface:'widgets',action:'nudge',target:'distance',privateText:'discard'};
  assert.equal(validateMascotEvents({events:[event]})[0].privateText,undefined);
  assert.throws(()=>validateMascotEvents({events:[{...event,action:'other'}]}));
  assert.throws(()=>validateMascotEvents({events:Array(41).fill(event)}));
});
test('event file appends complete JSONL records without replacing earlier events',async()=>{
  const folder=await mkdtemp(path.join(tmpdir(),'mascot-log-'));
  try{
    const file=path.join(folder,'events.jsonl');
    const events=validateMascotEvents({events:[{at:'2026-10-17T12:00:00Z',surface:'chat',action:'blink'}]});
    await writeMascotEvents(file,events);await writeMascotEvents(file,events);
    assert.deepEqual((await readFile(file,'utf8')).trim().split('\n').map(JSON.parse),[...events,...events]);
  }finally{await rm(folder,{recursive:true,force:true});}
});


test('gradient focus skips the reproduced near-zero rendering failure in every direction',async()=>{
  const {stableGradientFocus,MIN_FOCAL_DISTANCE}=await import('../src/mascot-lighting.js');
  for(const sign of [-1,1]){
    for(const [x,y] of [[.0001,.00004],[.00004,.0001],[.0001,0],[0,.0001],[1e-12,1e-12]]){
      assert.deepEqual(stableGradientFocus(sign*x,sign*y),{fx:0,fy:0});
    }
  }
  assert.deepEqual(stableGradientFocus(0,0),{fx:0,fy:0});
  assert.deepEqual(stableGradientFocus(-.113,.038),{fx:-.113,fy:.038});
  assert.ok(MIN_FOCAL_DISTANCE*92<.5,'neutral snap stays below half an SVG unit');
});
test('interrupted gaze transitions never emit a nonzero focal point inside the unstable range',async()=>{
  const {stableGradientFocus,MIN_FOCAL_DISTANCE}=await import('../src/mascot-lighting.js');
  for(const [from,to] of [[[-.113,-.038],[0,0]],[[0,0],[.094,-.057]],[[.132,.14],[-.019,-.02]],[[-.11,0],[.076,0]]]){
    for(let frame=0;frame<=650;frame++){
      const t=1-(1-frame/650)**3;
      const {fx,fy}=stableGradientFocus(from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t);
      const distance=Math.hypot(fx,fy);
      assert.ok(distance===0||distance>=MIN_FOCAL_DISTANCE);
    }
  }
});
