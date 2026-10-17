import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {caseLayout,shell} from '../presentation/src/case-layout.mjs';
import {caseScrollGeometry,caseScrollPosition} from '../presentation/src/case-scroll.mjs';
import {scenes,entries} from '../presentation/src/story.ts';
import {canOpenDetail} from '../src/case-scope.js';
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
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
test('viewport height changes retain fractional progress within a scene',()=>{
 const before=caseScrollGeometry(844,scenes.length,true),after=caseScrollGeometry(740,scenes.length,true);
 const position=6.2*before.step,resizedPosition=position/before.step*after.step;
 assert.deepEqual(caseScrollPosition(resizedPosition,after),{history:false,index:6});
 assert.ok(Math.abs(resizedPosition/after.step-6.2)<1e-9);
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
