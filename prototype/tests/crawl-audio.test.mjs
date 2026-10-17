import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrawlAudio} from '../presentation/src/crawl-audio.ts';
import {NORMAL_VOLUME,REVERSE_VOLUME} from '../presentation/src/crawl-playback.mjs';

test('audio transport reverses actual samples, fades quietly, mutes and stops',async()=>{
  const sources=[],gains=[];
  const param=()=>({value:0,events:[],setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);},setTargetAtTime(value){this.value=value;},linearRampToValueAtTime(value,time){this.value=value;this.events.push(['ramp',value,time]);},cancelScheduledValues(){}});
  class Buffer {
    constructor(channels,length,rate){this.numberOfChannels=channels;this.length=length;this.sampleRate=rate;this.duration=length/rate;this.channels=Array.from({length:channels},()=>new Float32Array(length));}
    getChannelData(channel){return this.channels[channel];}
    copyToChannel(data,channel){this.channels[channel].set(data);}
  }
  const decoded=new Buffer(2,8,2);decoded.channels[0].set([.1,.2,.3,.4,.5,.6,.7,.8]);decoded.channels[1].set([-.1,-.2,-.3,-.4,-.5,-.6,-.7,-.8]);
  class Context {
    currentTime=0;state='suspended';destination={};
    createGain(){const gain={gain:param(),connect(){},disconnect(){}};gains.push(gain);return gain;}
    createBuffer(...args){return new Buffer(...args);}
    createBufferSource(){const source={playbackRate:param(),connect(){},disconnect(){},start(time,offset){this.offset=offset;},stop(){this.stopped=true;}};sources.push(source);return source;}
    async decodeAudioData(){return decoded;}
    async resume(){this.state='running';}
    async suspend(){this.state='suspended';}
  }
  const original=globalThis.AudioContext;globalThis.AudioContext=Context;
  try{
    let state;const audio=createCrawlAudio(value=>{state=value;});
    await audio.load(Promise.resolve(new ArrayBuffer(8)));assert.equal(audio.ready,true);
    assert.equal(gains[0].gain.value,.05);assert.equal(state.volume,.05);
    audio.play(1);assert.equal(sources.at(-1).buffer,decoded);assert.equal(sources.at(-1).offset,1);assert.equal(gains.at(-1).gain.value,NORMAL_VOLUME);
    audio.play(1,-1,true);assert.equal(sources.at(-1).offset,3);assert.equal(gains.at(-1).gain.value,REVERSE_VOLUME);
    assert.deepEqual([...sources.at(-1).buffer.getChannelData(0)],[...decoded.getChannelData(0)].reverse());
    assert.deepEqual([...sources.at(-1).buffer.getChannelData(1)],[...decoded.getChannelData(1)].reverse());
    assert.equal(sources[0].stopped,true);assert.equal(state.direction,-1);
    audio.toggleMuted();assert.equal(state.playing,false);assert.equal(gains[0].gain.value,0);
    audio.toggleMuted();assert.equal(state.playing,true);
    audio.setVolume(.2);assert.equal(gains[0].gain.value,.2);assert.equal(state.volume,.2);
    audio.toggleMuted();audio.toggleMuted();assert.equal(gains[0].gain.value,.2);
    audio.setVolume(0);assert.equal(state.playing,false);
    audio.toggleMuted();assert.equal(state.playing,true);assert.equal(gains[0].gain.value,.2);
    audio.setVolume(2);assert.equal(gains[0].gain.value,1);
    audio.suspend();assert.equal(state.playing,false);assert.equal(sources.at(-1).stopped,true);
    audio.resume();audio.play(2,1,false,1.4);
    assert.deepEqual(sources.at(-1).playbackRate.events,[['set',0,0],['ramp',1,1.4]]);
    assert.deepEqual(gains.at(-1).gain.events,[['set',0,0],['ramp',NORMAL_VOLUME,1.4]]);
  }finally{globalThis.AudioContext=original;}
});
