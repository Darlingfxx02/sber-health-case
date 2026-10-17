import test from 'node:test';
import assert from 'node:assert/strict';
import {readStartView,saveStartView} from '../src/preferences.js';

test('first launch uses chat; either chosen home survives a new read',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  assert.equal(readStartView(storage),'chat');
  for(const view of ['widgets','chat']){
    assert.equal(saveStartView(view,storage),true);
    assert.equal(readStartView(storage),view);
  }
});
test('invalid or legacy settings cannot select a non-existent home',()=>{
  assert.equal(readStartView({getItem:()=>'{"home":"unknown"}'}),'chat');
  assert.equal(saveStartView('history',{setItem:()=>assert.fail('must not store invalid values')}),false);
});
test('unavailable storage falls back without claiming a successful save',()=>{
  const storage={getItem(){throw new Error('blocked');},setItem(){throw new Error('full');}};
  assert.equal(readStartView(storage),'chat');
  assert.equal(saveStartView('widgets',storage),false);
});
