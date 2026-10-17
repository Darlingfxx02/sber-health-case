import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelPixels,seekCrawl,loopOffset,reverseSamples,NORMAL_VOLUME,REVERSE_VOLUME,playbackAdvance} from '../presentation/src/crawl-playback.mjs';

test('wheel units stay consistent for mouse and trackpad; large gestures are bounded',()=>{
  assert.equal(wheelPixels(4,1,800),wheelPixels(72,0,800));
  assert.equal(wheelPixels(-2,2,800),-600);
  assert.equal(wheelPixels(0,0,800),0);
});
test('scrolling can revisit text and clamps at both ends of the crawl',()=>{
  assert.equal(seekCrawl(12000,-60,1200,24000),10800);
  assert.equal(seekCrawl(0,-100,1200,24000),0);
  assert.equal(seekCrawl(23999,100,1200,24000),24000);
});
test('reverse playback begins at the matching moment, including loop boundaries',()=>{
  assert.equal(loopOffset(20,100,-1),80);
  assert.equal(loopOffset(120,100,-1),80);
  assert.equal(loopOffset(100,100,-1),0);
  assert.equal(loopOffset(-1,100),99);
  const original=new Float32Array([.1,.2,-.3,.5]);
  const reversed=reverseSamples(original);
  assert.deepEqual([...reversed],[...original].reverse());
  assert.deepEqual([...reverseSamples(reversed)],[...original]);
  assert.equal(original[0],Math.fround(.1));
  assert.ok(REVERSE_VOLUME<NORMAL_VOLUME/3);
});
test('audio position stays aligned with the text during and after gradual acceleration',()=>{
  assert.equal(playbackAdvance(0,1.4),0);
  assert.equal(playbackAdvance(.7,1.4),.175);
  assert.equal(playbackAdvance(1.4,1.4),.7);
  assert.equal(playbackAdvance(2.4,1.4),1.7);
  assert.equal(playbackAdvance(2.4),2.4);
});
