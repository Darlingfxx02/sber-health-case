export const AUTO_RESUME_MS=2800;
export const SCRUB_AUDIO_TAIL_MS=180;
export const NORMAL_VOLUME=.28;
export const REVERSE_VOLUME=.065;
export const RESUME_RAMP_MS=1400;
// Distance travelled while a playback rate ramps linearly from zero to one.
export function playbackAdvance(elapsed,ramp=0){return ramp>0&&elapsed<ramp?elapsed*elapsed/(2*ramp):elapsed-ramp/2;}
export function wheelPixels(delta,mode,height){return Math.max(-600,Math.min(600,delta*(mode===1?18:mode===2?height:1)));}
export function seekCrawl(time,deltaPixels,travel,duration){return Math.max(0,Math.min(duration,time+deltaPixels*duration/Math.max(1,travel)));}
export function loopOffset(time,duration,direction=1){
  const forward=((time%duration)+duration)%duration;
  return direction===-1?(duration-forward)%duration:forward;
}
export function reverseSamples(source){return source.slice().reverse();}
