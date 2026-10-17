import {agentText} from './agent-text';
import {createStarfield} from './starfield';
import {createCrawlAudio} from './crawl-audio';
import {epilogueAudioUrl} from './epilogue-audio-config';
import {createScrollPause,SCRUB_AUDIO_TAIL_MS,RESUME_RAMP_MS,wheelPixels,seekCrawl} from './crawl-playback.mjs';
import './epilogue.css';
const icon=(name:string,extra='')=>`<span class="case-icon ${extra}" style="--icon:url('assets/iconsax/${name}.svg')" aria-hidden="true"></span>`;

export function createCaseEpilogue(root:HTMLElement){
  const entry=document.createElement('section');entry.className='case-outro';
  entry.setAttribute('aria-label','Эпилог');
  entry.innerHTML=`<div class="agent-entry"><canvas class="agent-stars" aria-hidden="true"></canvas><div class="agent-entry-content"><div class="agent-entry-copy"><h2>Что обо мне думает агент</h2><p class="agent-entry-note" id="agent-entry-note">Осторожно, музыка (негромко)</p></div><button class="agent-entry-read" type="button" aria-haspopup="dialog" aria-controls="agent-epilogue" aria-describedby="agent-entry-note">Читать</button></div></div>`;
  root.querySelector('main')!.append(entry);
  const dialog=document.createElement('dialog');dialog.id='agent-epilogue';dialog.className='agent-epilogue';dialog.setAttribute('aria-labelledby','agent-title');
  dialog.innerHTML=`<canvas class="agent-stars" aria-hidden="true"></canvas><div class="agent-toolbar"><span data-scroll-status>Эпилог</span><div class="agent-toolbar-actions"><button type="button" class="agent-sound" data-sound>Добавить музыку</button><input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" data-audio-file hidden><button class="agent-close" type="button" aria-label="Закрыть титры">${icon('add','agent-close-icon')}</button></div></div><div class="agent-crawl-window" tabindex="0" role="region" aria-label="Текст агента. Прокрутка — колесом или стрелками, пауза — пробелом"><div class="agent-crawl-plane"><article class="agent-crawl-copy"><p class="agent-crawl-warning">Осторожно, много мата</p><h2 id="agent-title">Что обо мне<br>думает агент</h2></article></div></div>`;
  root.append(dialog);
  const surface=document.createElement('div');surface.className='agent-player-surface';surface.setAttribute('aria-hidden','true');
  const transitionLabel=document.createElement('div');transitionLabel.className='agent-transition-label';transitionLabel.inert=true;transitionLabel.append(entry.querySelector('.agent-entry-content')!.cloneNode(true));transitionLabel.querySelector('[id]')!.removeAttribute('id');transitionLabel.querySelector('button')!.removeAttribute('aria-describedby');surface.append(transitionLabel);
  dialog.querySelector('.agent-stars')!.replaceWith(surface);
  const soundButton=dialog.querySelector<HTMLButtonElement>('[data-sound]')!;
  const volumeControl=document.createElement('div');volumeControl.className='agent-volume-control';soundButton.before(volumeControl);volumeControl.append(soundButton);
  const volumeSlider=document.createElement('input');volumeSlider.type='range';volumeSlider.min='0';volumeSlider.max='100';volumeSlider.step='1';volumeSlider.value='5';volumeSlider.setAttribute('aria-label','Громкость музыки');volumeSlider.style.setProperty('--volume','5%');
  volumeControl.append(volumeSlider);
  soundButton.innerHTML=icon('volume-high-fill','volume-waves')+icon('volume-cross-fill','volume-off');
  const card=entry.querySelector<HTMLElement>('.agent-entry')!,button=entry.querySelector('button')!,copy=dialog.querySelector<HTMLElement>('.agent-crawl-copy')!,viewport=dialog.querySelector<HTMLElement>('.agent-crawl-window')!;
  for(const paragraph of agentText.split('\n\n')){const p=document.createElement('p');p.textContent=paragraph;copy.append(p);}
  const close=dialog.querySelector<HTMLButtonElement>('.agent-close')!;
  const starCanvas=entry.querySelector('canvas')!,entryStars=createStarfield(starCanvas);
  const sound=dialog.querySelector<HTMLButtonElement>('[data-sound]')!,audioFile=dialog.querySelector<HTMLInputElement>('[data-audio-file]')!,scrollStatus=dialog.querySelector<HTMLElement>('[data-scroll-status]')!;
  let animation:Animation|null=null,surfaceAnimation:Animation|null=null,paused=false,overflow='',openToken=0,resizeFrame=0;
  let phase:'closed'|'opening'|'open'|'closing'='closed';
  function setPhase(value:typeof phase){phase=value;dialog.dataset.phase=value;}
  let travel=1,duration=1,rateFrame=0,scrubSoundTimer=0,pointer:{id:number;y:number}|null=null;
  const music=createCrawlAudio(state=>{
    const silent=state.muted||state.volume===0;
    const label=state.status==='empty'?'Добавить музыку':state.status==='loading'?'Музыка загружается':state.status==='error'?'Выбрать аудиофайл':silent?'Включить музыку':'Выключить музыку';
    sound.setAttribute('aria-label',label);sound.title=label;sound.dataset.muted=String(silent);
    sound.setAttribute('aria-pressed',String(state.status==='ready'&&!silent));
    const percent=Math.round(state.volume*100);volumeSlider.value=String(percent);volumeSlider.setAttribute('aria-valuetext',percent+'%');volumeSlider.style.setProperty('--volume',percent+'%');
    dialog.dataset.audio=state.status;dialog.dataset.audioDirection=String(state.direction);dialog.dataset.audioPlaying=String(state.playing);
  });
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const scrollPause=createScrollPause((holding:boolean)=>{
    dialog.dataset.scrubbing='true';stopRateRamp();animation?.pause();entryStars.setActive(false);
    if(holding){clearTimeout(scrubSoundTimer);music.stop();}
    scrollStatus.textContent=paused?'Пауза':'Автопрокрутка после паузы';
  },()=>{dialog.dataset.scrubbing='false';syncPlayback(true);});
  const words=agentText.split(/\s+/u).length;
  let audioBytes:Promise<ArrayBuffer>|null=null;
  function prepareAudio(){
    audioBytes??=fetch(epilogueAudioUrl,{signal:AbortSignal.timeout(60000)}).then(response=>{if(!response.ok)throw new Error('Audio unavailable');return response.arrayBuffer();});
    // Preloading is optional. The transport reports failures after an explicit open.
    void audioBytes.catch(()=>{audioBytes=null;});
    return audioBytes;
  }
  // Fetch with the page, but create/resume the audio transport only on a user gesture.
  void prepareAudio();
  void document.fonts.load('700 48px "Roboto Condensed"','Что обо мне думает агент').catch(()=>{});
  button.addEventListener('pointerenter',prepareAudio);button.addEventListener('focus',prepareAudio);
  function entryShape(){
    const box=card.getBoundingClientRect();
    return {left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',borderRadius:getComputedStyle(card).borderRadius};
  }
  async function morphSurface(target:{left:string;top:string;width:string;height:string;borderRadius:string},duration:number){
    const box=surface.getBoundingClientRect();
    const from={left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',borderRadius:getComputedStyle(surface).borderRadius};
    surfaceAnimation?.cancel();Object.assign(surface.style,target);
    if(motion.matches)return;
    const current=surface.animate([from,target],{duration,easing:'cubic-bezier(.22,1,.36,1)'});surfaceAnimation=current;
    await current.finished.catch(()=>{});if(surfaceAnimation===current)surfaceAnimation=null;
  }
  function stopRateRamp(){cancelAnimationFrame(rateFrame);rateFrame=0;dialog.dataset.resuming='false';if(animation)animation.playbackRate=1;}
  function syncPlayback(smooth=false){
    const finished=animation?.playState==='finished';
    const stopped=paused||scrollPause.active||document.hidden||!dialog.open||phase!=='open'||finished;
    if(stopped){stopRateRamp();if(animation&&animation.playState!=='finished')animation.pause();}
    else if(animation&&smooth){
      stopRateRamp();animation.playbackRate=0;animation.play();dialog.dataset.resuming='true';
      const beginning=performance.now();
      const accelerate=(now:number)=>{if(!animation)return;const rate=Math.min(1,(now-beginning)/RESUME_RAMP_MS);animation.playbackRate=rate;if(rate<1)rateFrame=requestAnimationFrame(accelerate);else{rateFrame=0;dialog.dataset.resuming='false';}};
      rateFrame=requestAnimationFrame(accelerate);
    }else animation?.play();
    entryStars.setActive(phase==='closed'||phase==='opening'||phase==='closing'||!stopped);
    if(stopped)music.stop();else music.play(Number(animation?.currentTime??0)/1000,1,false,smooth?RESUME_RAMP_MS/1000:0);
    scrollStatus.textContent=paused?'Пауза':finished?'Эпилог окончен':'Эпилог';
  }
  function clearScrub(){scrollPause.reset();clearTimeout(scrubSoundTimer);pointer=null;dialog.dataset.scrubbing='false';scrollStatus.textContent='Эпилог';}
  function start(progress=0){
    if(!dialog.open||phase!=='open')return;
    stopRateRamp();
    animation?.cancel();
    travel=copy.offsetHeight+viewport.clientHeight*1.6;
    duration=Math.max(words/2.7*1000,travel/(innerWidth<600?20:29)*1000)/1.15;
    animation=copy.animate([{transform:'translateY(-64px)'},{transform:`translateY(-${travel}px)`}],{duration,easing:'linear',fill:'forwards'});
    animation.currentTime=duration*progress;animation.onfinish=()=>syncPlayback();syncPlayback();
  }
  button.onclick=async()=>{
    if(phase!=='closed')return;
    const origin=entryShape();
    const token=++openToken;overflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
    Object.assign(surface.style,origin);setPhase('opening');
    dialog.showModal();surface.prepend(starCanvas);card.style.visibility='hidden';entryStars.setActive(true);
    music.resume();
    if(!music.ready)void music.load(prepareAudio()).then(()=>{if(dialog.open&&token===openToken)syncPlayback();});
    clearScrub();paused=motion.matches;
    // Font loading never holds the player here; font-display:swap supplies a fallback.
    // The same star canvas expands from the card bounds; start the crawl once it fills the viewport.
    await morphSurface({left:'0px',top:'0px',width:'100%',height:'100%',borderRadius:'0px'},700);
    if(dialog.open&&token===openToken){setPhase('open');close.focus({preventScroll:true});start();}
  };
  async function closePlayer(){
    if(!dialog.open||phase==='closing')return;
    const token=++openToken;setPhase('closing');clearScrub();stopRateRamp();animation?.pause();music.suspend();entryStars.setActive(true);
    await morphSurface(entryShape(),480);
    if(dialog.open&&token===openToken)dialog.close();
  }
  close.onclick=()=>{void closePlayer();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();void closePlayer();});
  dialog.addEventListener('close',()=>{openToken++;clearScrub();stopRateRamp();surfaceAnimation?.cancel();surfaceAnimation=null;animation?.cancel();animation=null;music.suspend();setPhase('closed');card.prepend(starCanvas);card.style.visibility='';entryStars.setActive(true);document.documentElement.style.overflow=overflow;button.focus({preventScroll:true});});
  sound.onclick=()=>{if(music.ready){music.resume();music.toggleMuted();}else audioFile.click();};
  volumeSlider.oninput=()=>{music.resume();music.setVolume(Number(volumeSlider.value)/100);};
  audioFile.onchange=async()=>{const file=audioFile.files?.[0];if(!file)return;await music.load(file.arrayBuffer());audioFile.value='';syncPlayback();};
  function scrub(delta:number){
    if(!animation||!dialog.open||phase!=='open'||!delta)return;
    scrollPause.move();animation.pause();animation.currentTime=seekCrawl(Number(animation.currentTime??0),delta,travel-64,duration);
    if(!document.hidden)music.play(Number(animation.currentTime)/1000,delta<0?-1:1,delta<0);
    clearTimeout(scrubSoundTimer);scrubSoundTimer=window.setTimeout(()=>music.stop(),SCRUB_AUDIO_TAIL_MS);
  }
  viewport.addEventListener('wheel',event=>{if(event.ctrlKey)return;event.preventDefault();scrub(wheelPixels(event.deltaY,event.deltaMode,viewport.clientHeight));},{passive:false});
  // Finger dragging follows the same timeline on compact screens.
  viewport.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'||!event.isPrimary||phase!=='open')return;pointer={id:event.pointerId,y:event.clientY};viewport.setPointerCapture(event.pointerId);scrollPause.hold();});
  viewport.addEventListener('pointermove',event=>{if(pointer?.id!==event.pointerId)return;scrub(pointer.y-event.clientY);pointer.y=event.clientY;});
  const releasePointer=(event:PointerEvent)=>{if(pointer?.id!==event.pointerId)return;pointer=null;scrollPause.release();};
  viewport.addEventListener('pointerup',releasePointer);viewport.addEventListener('pointercancel',releasePointer);viewport.addEventListener('lostpointercapture',releasePointer);
  dialog.addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement)return;if(event.code==='Space'&&event.target===viewport){event.preventDefault();clearScrub();if(animation?.playState==='finished'){paused=false;start();}else{paused=!paused;syncPlayback(!paused);}}if(['ArrowUp','ArrowDown','PageUp','PageDown'].includes(event.key)){event.preventDefault();scrub((event.key.endsWith('Up')?-1:1)*(event.key.startsWith('Page')?viewport.clientHeight*.7:90));}});
  document.addEventListener('visibilitychange',()=>syncPlayback(!document.hidden));
  const motionChanged=()=>{if(dialog.open&&motion.matches){surfaceAnimation?.finish();paused=true;clearScrub();syncPlayback();}};motion.addEventListener('change',motionChanged);
  const resize=new ResizeObserver(()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{if(!dialog.open||phase!=='open'||!animation)return;const timing=animation.effect!.getComputedTiming();start(Number(timing.progress??0));});
  });resize.observe(viewport);resize.observe(copy);
  // Fade the phone before the CTA reaches its lower edge, also when scrolling backwards.
  const device=root.querySelector<HTMLElement>('.live-device')!;
  let departureFrame=0;
  function updateDeparture(){
    cancelAnimationFrame(departureFrame);
    departureFrame=requestAnimationFrame(()=>{
      const gap=entry.getBoundingClientRect().top-device.getBoundingClientRect().bottom;
      const opacity=Math.max(0,Math.min(1,(gap-72)/180));
      root.style.setProperty('--outro-device-opacity',String(opacity));root.dataset.outro=String(opacity===0);
    });
  }
  window.addEventListener('scroll',updateDeparture,{passive:true});window.addEventListener('resize',updateDeparture);
  new ResizeObserver(updateDeparture).observe(root.querySelector('main')!);
  new MutationObserver(updateDeparture).observe(root,{attributes:true,attributeFilter:['data-history','data-free']});
  updateDeparture();
  return {entry,isOpen:()=>dialog.open};
}
