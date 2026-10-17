import {loopOffset,reverseSamples,NORMAL_VOLUME,REVERSE_VOLUME,playbackAdvance} from './crawl-playback.mjs';
type AudioState={status:'empty'|'loading'|'ready'|'error';playing:boolean;muted:boolean;direction:number;volume:number};
type Voice={source:AudioBufferSourceNode;gain:GainNode;started:number;at:number;direction:number;ramp:number};
export function createCrawlAudio(onState:(state:AudioState)=>void){
  let context:AudioContext|null=null,output:GainNode|null=null,forward:AudioBuffer|null=null,backward:AudioBuffer|null=null,voice:Voice|null=null;
  let status:AudioState['status']='empty',muted=false,volume=.05,lastVolume=.05,version=0;
  const emit=()=>onState({status,playing:!!voice&&context?.state==='running'&&!muted&&volume>0,muted,direction:voice?.direction??0,volume});
  function retire(old:Voice|null){
    if(!old||!context)return;
    old.gain.gain.cancelScheduledValues(context.currentTime);old.gain.gain.setTargetAtTime(0,context.currentTime,.018);
    old.source.stop(context.currentTime+.08);old.source.onended=()=>{old.source.disconnect();old.gain.disconnect();};
  }
  function stop(){const old=voice;voice=null;retire(old);emit();}
  async function load(data:Promise<ArrayBuffer>){
    const token=++version;stop();status='loading';
    try{
      context??=new AudioContext();
      if(!output){output=context.createGain();output.connect(context.destination);}
      output.gain.setValueAtTime(muted?0:volume,context.currentTime);
      // Resume synchronously from the click/file-selection gesture.
      const resumed=context.resume();emit();
      const decoded=await context.decodeAudioData(await data);await resumed;
      if(token!==version)return;
      const reversed=context.createBuffer(decoded.numberOfChannels,decoded.length,decoded.sampleRate);
      for(let channel=0;channel<decoded.numberOfChannels;channel++)reversed.copyToChannel(reverseSamples(decoded.getChannelData(channel)),channel);
      forward=decoded;backward=reversed;status='ready';emit();
    }catch{if(token===version){status='error';emit();}}
  }
  function play(at:number,direction=1,quiet=false,ramp=0){
    if(!context||!output||!forward||!backward)return;
    const now=context.currentTime,target=loopOffset(at,forward.duration);
    const current=voice?loopOffset(voice.at+playbackAdvance(now-voice.started,voice.ramp)*voice.direction,forward.duration):0;
    const difference=Math.abs(current-target),drift=Math.min(difference,forward.duration-difference);
    if(voice&&voice.direction===direction&&drift<.3&&!ramp){return;}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=direction===-1?backward:forward;source.loop=true;
    source.connect(gain);gain.connect(output);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(quiet?REVERSE_VOLUME:NORMAL_VOLUME,now+Math.max(.04,ramp));
    source.playbackRate.setValueAtTime(ramp?0:1,now);if(ramp)source.playbackRate.linearRampToValueAtTime(1,now+ramp);
    const old=voice;voice={source,gain,started:now,at:target,direction,ramp};
    source.start(now,loopOffset(at,forward.duration,direction));retire(old);emit();
  }
  return {
    load,play,stop,
    resume(){if(context)void context.resume().then(emit);},
    suspend(){stop();if(context)void context.suspend();},
    toggleMuted(){if(volume===0){volume=lastVolume;muted=false;}else muted=!muted;if(context&&output)output.gain.setTargetAtTime(muted?0:volume,context.currentTime,.04);emit();},
    setVolume(value:number){volume=Math.max(0,Math.min(1,value));if(volume>0){muted=false;lastVolume=volume;}if(context&&output)output.gain.setTargetAtTime(muted?0:volume,context.currentTime,.04);emit();},
    get ready(){return status==='ready';}
  };
}
