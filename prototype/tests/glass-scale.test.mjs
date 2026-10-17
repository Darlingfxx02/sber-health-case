import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSceneSpace} from '../patches/glass-scene-space.mjs';
import {patchGlassSource} from '../patches/liquid-glass-scale.mjs';

for(const [sx,sy] of [[1,1],[.6,.6],[.8,.8],[1.25,1.25],[.7,.9],[.8*1.25,.8*1.25]]){
  test(`filter geometry stays in layout coordinates at ${sx} × ${sy}`,()=>{
    const rect={left:319.25,top:87.5,width:167*sx,height:48*sy};
    const space=createSceneSpace(rect,167,48);
    const tab={left:rect.left+61*sx,top:rect.top+4*sy,width:102*sx,height:40*sy};
    const actual=space.box(tab),expected={x:61,y:4,w:102,h:40};
    for(const key of Object.keys(expected))assert.ok(Math.abs(actual[key]-expected[key])<1e-9,key);
    const restored=space.viewport(actual);
    for(const key of Object.keys(tab))assert.ok(Math.abs(restored[key]-tab[key])<1e-9,key);
  });
}
test('hidden/zero-size scenes do not produce NaN or Infinity',()=>{
  assert.deepEqual(createSceneSpace({left:0,top:0,width:0,height:0},0,0).box({left:0,top:0,width:0,height:0}),{x:0,y:0,w:0,h:0});
});
test('all pinned upstream patches apply and reject an unreviewed upgrade',async()=>{
  for(const name of ['dom.js','dom/interaction.js','dom/ticker.js']){
    const source=await readFile(new URL(`../node_modules/@glass-sdk/liquid-glass/dist/${name}`,import.meta.url),'utf8');
    assert.notEqual(patchGlassSource(name,source),source);
    assert.throws(()=>patchGlassSource(name,source+'\n'),/upstream .* changed/);
  }
});
