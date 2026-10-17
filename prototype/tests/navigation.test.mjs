import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeDestination,navigationOffsets} from '../history-gesture.js';

const swipe=(page,delta,extra={})=>swipeDestination({page,delta,width:402,...extra});
test('two left swipes go from history through chat to widgets; right swipes reverse the route',()=>{
  assert.equal(swipe(0,-120),1);
  assert.equal(swipe(1,-120),2);
  assert.equal(swipe(2,120),1);
  assert.equal(swipe(1,120),0);
});
test('one gesture never skips chat, even if it crosses more than one screen',()=>{
  assert.equal(swipe(0,-900),1);
  assert.equal(swipe(2,900),1);
});
test('small or cancelled gestures stay on the current destination',()=>{
  for(const page of [0,1,2]){
    assert.equal(swipe(page,-35),page);
    assert.equal(swipe(page,35),page);
    assert.equal(swipe(page,-180,{cancelled:true}),page);
    assert.equal(swipe(page,180,{cancelled:true}),page);
  }
});
test('a deliberate short flick commits, a tap or a reversed release does not',()=>{
  assert.equal(swipe(1,-40,{velocity:-.6}),2);
  assert.equal(swipe(1,40,{velocity:.6}),0);
  assert.equal(swipe(1,-8,{velocity:-.9}),1);
  assert.equal(swipe(1,-40,{velocity:.6}),1);
});
test('outer destinations do not wrap',()=>{
  assert.equal(swipe(0,180),0);
  assert.equal(swipe(2,-180),2);
});
test('distance threshold follows the device width',()=>{
  assert.equal(swipe(1,-75,{width:320}),2);
  assert.equal(swipe(1,-75,{width:600}),1);
  assert.equal(swipe(1,-75,{width:0}),1);
});
test('header travels with the drawer but stays fixed while moving between tabs',()=>{
  assert.deepEqual(navigationOffsets(0,400),{history:400,view:-0});
  assert.deepEqual(navigationOffsets(.5,400),{history:200,view:-0});
  assert.deepEqual(navigationOffsets(1,400),{history:0,view:-0});
  assert.deepEqual(navigationOffsets(1.5,400),{history:0,view:-200});
  assert.deepEqual(navigationOffsets(2,400),{history:0,view:-400});
});
