import {createCaseEffects} from './case-effects';
import {createCaseEpilogue} from './case-epilogue';
import {sameOriginAdapter} from './core/adapter';
import {scenes,entries} from './story';
import {caseLayout,shell} from './case-layout.mjs';
import {caseScrollGeometry,caseScrollPosition} from './case-scroll.mjs';
import {createCaseTouchScroll} from './case-touch-scroll.mjs';
import {playInteractionDemo} from './case-interaction-demo';
import './style.css';
const root=document.querySelector<HTMLElement>('#case')!;
const icon=(name:string)=>`<span class="case-icon" style="--icon:url('assets/iconsax/${name}.svg')" aria-hidden="true"></span>`;
const esc=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const frameUrl='presentation/public/dresser/iphone-17-pro-max-deep-blue.png';
root.innerHTML=`

<div class="case-progress" aria-hidden="true"><i></i></div>
<main>
<div class="case-tour">
<section class="case-stage" aria-label="Презентация решения">
  <div class="case-device before-device" aria-hidden="true"><div class="case-screen"><img class="comparison-image" alt=""/></div><img class="frame-art" src="${frameUrl}" alt=""/><span class="device-caption">Ранний вариант</span></div>
  <div class="case-device live-device"><div class="case-screen"><iframe src="app.html?embed=case" title="Живой прототип СберЗдоровья"></iframe><div class="case-shield"></div></div><img class="frame-art" src="${frameUrl}" alt="iPhone 17 Pro Max Deep Blue"/><span class="device-caption">Решение</span></div>
  <svg class="tour-overlay" aria-hidden="true"></svg>
  <article class="case-copy" tabindex="0"><h1></h1><div class="scene-body"></div><div class="interaction-demo-controls" hidden><p data-demo-status></p><div><button data-demo-toggle aria-pressed="false">Пауза</button><button data-demo-replay>Повторить</button></div></div></article>
  <div class="tour-controls"><button data-prev class="arrow-button" aria-label="Предыдущий этап">${icon('chevron-right')}</button><button data-explore>Исследовать макет</button><button data-next class="arrow-button" aria-label="Следующий этап">${icon('chevron-right')}</button><span class="tour-count"></span></div>
  <p class="case-error" role="alert" hidden></p>
  <div class="free-controls" hidden><button data-close-free>К кейсу</button></div>
</section>
<div class="case-track" aria-hidden="true"></div>
</div>
<section class="case-history" id="process" aria-labelledby="history-title"><div class="history-head"><h2 id="history-title">Как пришли к решению</h2><div class="history-mode" role="group" aria-label="Подробность истории"><button data-density="short" aria-pressed="true">Коротко</button><button data-density="full" aria-pressed="false">Подробно</button></div></div>
<div class="history-entries">${entries.map((entry,i)=>`<article class="history-entry" id="log-${entry.id}"><button class="entry-heading" aria-expanded="false" aria-controls="entry-${entry.id}">${icon(entry.icon)}<span>${entry.title}</span>${icon('chevron-down')}</button><div class="entry-detail" id="entry-${entry.id}" hidden><p>${entry.body}</p>${entry.link?`<a class="evidence-link" href="${entry.link}" target="_blank" rel="noreferrer">Открыть Figma</a>`:''}</div>${entry.images?`<div class="entry-images">${entry.images.map(img=>`<button class="evidence-image" data-src="${img.src}" data-caption="${esc(img.label)}" aria-label="Увеличить: ${esc(img.label)}"><img src="${img.src}" alt="${esc(img.label)}" loading="lazy"/><span>${img.label}</span></button>`).join('')}</div>`:''}</article>`).join('')}</div>
<footer class="history-end"><h3>Дальше проверим гипотезы</h3><p>Сравним варианты в пользовательских тестах: измерим время выполнения заданий, успешность без подсказок и ошибки. Проверим выбор между чатом и виджетами, свайпы одной рукой и перенос измерения в разговор. Пользовательские исследования ещё не проводились.</p><button data-restart>Вернуться к решению</button></footer>
</section>
</main>
<div class="free-backdrop" hidden aria-hidden="true"></div>
<dialog class="evidence-viewer"><button data-close-image aria-label="Закрыть изображение">${icon('add')}</button><img alt=""/><p></p></dialog>`;
const $=<T extends HTMLElement>(q:string)=>root.querySelector<T>(q)!;
const epilogue=createCaseEpilogue(root);
const frame=$<HTMLIFrameElement>('iframe'),adapter=sameOriginAdapter(frame),stage=$('.case-stage'),copy=$('.case-copy'),device=$('.live-device'),before=$('.before-device'),controls=$('.tour-controls'),history=$('.case-history'),track=$('.case-track');
const effects=createCaseEffects(stage);let focusFrame=0;
let historyTimer=0,moving=false;
let index=0,historyMode=false,free=false,operation=new AbortController(),resizeFrame=0,historyTop=0,focusTargets:HTMLElement[]=[],ready=false;
let scrollGeometry:ReturnType<typeof caseScrollGeometry>|null=null;
const compact=()=>window.innerWidth<1000;
const place=(el:HTMLElement,box:any)=>Object.assign(el.style,{width:shell.width+'px',height:shell.height+'px',transform:`translate3d(${box.x}px,${box.y}px,0) scale(${box.scale})`});
function layout(){
  const geo=caseLayout(window.innerWidth,window.innerHeight,{compare:!!scenes[index].compare&&!historyMode&&!free,history:historyMode,free});
  if(free){stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-label','Исследование прототипа');}else{stage.removeAttribute('role');stage.removeAttribute('aria-modal');stage.setAttribute('aria-label','Презентация решения');}
  $('.free-controls').hidden=!free;
  root.dataset.compact=String(geo.compact);root.dataset.history=String(historyMode);root.dataset.free=String(free);
  root.dataset.comparison=String(!!scenes[index].compare&&!historyMode&&!free);
  place(device,geo.device);place(before,geo.before);
  root.style.setProperty('--phone-caption',`${13/geo.device.scale}px`);
  [device,before].forEach(el=>{const screen=el.querySelector<HTMLElement>('.case-screen')!;Object.assign(screen.style,{left:shell.x+'px',top:shell.y+'px',width:shell.screenWidth+'px',height:shell.screenHeight+'px'});});
  if(geo.text){Object.assign(copy.style,{left:geo.text.x+'px',top:geo.text.y+'px',width:geo.text.width+'px',height:geo.text.height+'px'});Object.assign(controls.style,{left:geo.compact?'24px':geo.text.x+'px',bottom:geo.compact?'20px':'72px',width:geo.compact?'calc(100% - 48px)':geo.text.width+'px'});}
  before.style.opacity=scenes[index].compare&&!historyMode&&!free?'1':'0';
  frame.inert=!free;$('.case-shield').hidden=free;
  copy.inert=historyMode||free;controls.inert=historyMode||free;history.inert=free||(!geo.compact&&(!historyMode||moving));
  epilogue.entry.inert=free||(!geo.compact&&!historyMode);
  if(free||historyMode)hideFocus();
}
function sizing(){
 const previous=scrollGeometry,scrollY=window.scrollY;
 scrollGeometry=caseScrollGeometry(window.innerHeight,scenes.length,compact());
 root.style.setProperty('--case-track-height',`${scrollGeometry.trackHeight}px`);
 root.style.setProperty('--case-viewport-height',`${window.innerHeight}px`);
 historyTop=track.offsetHeight;
 // Mobile browser chrome and orientation changes must keep the current reading position.
 if(previous&&(Math.abs(previous.step-scrollGeometry.step)>1||Math.abs(previous.trackHeight-scrollGeometry.trackHeight)>1)){
  const top=historyMode?scrollY+scrollGeometry.trackHeight-previous.trackHeight:scrollY/previous.step*scrollGeometry.step;
  window.scrollTo({top,behavior:'instant'});
 }
 layout();
}
function copyScene(){
 const scene=scenes[index];root.dataset.scene=scene.id;
 $('h1').textContent=scene.title;$('h1').hidden=!!scene.blocks;
 $('.scene-body').innerHTML=scene.blocks?scene.blocks.map(block=>`<section class="hypothesis-section"><h2>${block.title}</h2><p>${block.body}</p></section>`).join(''):scene.body.split('\n\n').map(p=>`<p>${p}</p>`).join('');
 $('.interaction-demo-controls').hidden=!scene.demo;
 copy.scrollTop=0;$('.tour-count').textContent=`${index+1} / ${scenes.length}`;
 $<HTMLButtonElement>('[data-prev]').disabled=index===0;
 $<HTMLButtonElement>('[data-next]').setAttribute('aria-label',index===scenes.length-1?'Перейти к истории':'Следующий этап');
 if(scene.compare){$<HTMLImageElement>('.comparison-image').src=scene.compare.src;before.querySelector('.device-caption')!.textContent=scene.compare.label;}
}
function hideFocus(){cancelAnimationFrame(focusFrame);effects.clear();focusTargets=[];}
function drawFocus(animate=false){
 if(!focusTargets.length||free||historyMode||moving)return;
 effects.draw(focusTargets,device.querySelector<HTMLElement>('.case-screen')!,animate);
}
function followFocus(){
 cancelAnimationFrame(focusFrame);const end=performance.now()+700;drawFocus(true);
 const tick=()=>{drawFocus();if(performance.now()<end)focusFrame=requestAnimationFrame(tick);};focusFrame=requestAnimationFrame(tick);
}

async function enter(next:number){
 operation.abort();operation=new AbortController();const{signal}=operation;ready=false;$<HTMLButtonElement>('[data-explore]').disabled=true;index=Math.min(scenes.length-1,Math.max(0,next));setHistoryMode(false);hideFocus();copyScene();layout();
 $('.case-error').hidden=true;
 try{
  const scene=scenes[index],anchors=typeof scene.focus==='string'?[scene.focus]:scene.focus??[];
  await adapter.ready(signal);await adapter.enter(scene.state,signal);await Promise.all(anchors.map(anchor=>adapter.settled(anchor,signal)));signal.throwIfAborted();
  const targets=await Promise.all(anchors.map(anchor=>adapter.find(anchor,signal)));signal.throwIfAborted();
  ready=true;$<HTMLButtonElement>('[data-explore]').disabled=false;focusTargets=targets;if(targets.length)followFocus();
  if(scene.demo)await playInteractionDemo({frame,screen:device.querySelector<HTMLElement>('.case-screen')!,controls:$('.interaction-demo-controls'),signal});
 }catch(error){if(signal.aborted)return;$('.case-error').textContent='Не удалось открыть этап. Попробуйте перейти к нему ещё раз.';$('.case-error').hidden=false;console.error(error);}
}
function navigate(next:number){
 textScroll.cancel();
 if(next>=scenes.length){showHistory();return;}
 if(next<0)return;
 window.scrollTo({top:next*scrollGeometry!.step,behavior:'instant'});void enter(next);
}
function setHistoryMode(value:boolean){
 if(value===historyMode)return;
 if(value)operation.abort();
 clearTimeout(historyTimer);historyMode=value;moving=true;root.dataset.moving='true';root.dataset.historyReady='false';hideFocus();layout();
 const finish=()=>{moving=false;root.dataset.moving='false';root.dataset.historyReady=String(historyMode);history.inert=free||(!compact()&&!historyMode);if(!historyMode)followFocus();};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||compact())finish();else historyTimer=window.setTimeout(finish,820);
}
function showHistory(){
 operation.abort();
 if(compact()){
  window.scrollTo({top:historyTop,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }else{setHistoryMode(true);window.scrollTo({top:historyTop,behavior:'instant'});layout();}
}

function onScroll(){
 if(free)return;
 const {history:isHistory,index:next}=caseScrollPosition(window.scrollY,scrollGeometry!);
 const wasHistory=historyMode;
 if(isHistory!==historyMode)setHistoryMode(isHistory);
 if(!isHistory&&(next!==index||wasHistory))void enter(next);
 $('.case-progress i').style.width=`${isHistory?100:(index+1)/scenes.length*100}%`;
}
let savedOverflow='';
function explore(){if(!ready)return;textScroll.cancel();operation.abort();free=true;hideFocus();savedOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';$('.free-backdrop').hidden=false;layout();$('[data-close-free]').focus();}
function closeFree(){free=false;document.documentElement.style.overflow=savedOverflow;$('.free-backdrop').hidden=true;void enter(index);$('[data-explore]').focus({preventScroll:true});}
$('[data-prev]').onclick=()=>navigate(index-1);$('[data-next]').onclick=()=>navigate(index+1);$('[data-explore]').onclick=explore;$('[data-close-free]').onclick=closeFree;
$('[data-demo-replay]').onclick=()=>void enter(index);
$('[data-restart]').onclick=()=>navigate(0);
function setEntry(entry:HTMLElement,open:boolean){entry.querySelector('button')!.setAttribute('aria-expanded',String(open));entry.querySelector<HTMLElement>('.entry-detail')!.hidden=!open;}
root.querySelectorAll<HTMLElement>('.history-entry').forEach(entry=>entry.querySelector('button')!.onclick=()=>setEntry(entry,entry.querySelector('button')!.getAttribute('aria-expanded')!=='true'));
root.querySelectorAll<HTMLButtonElement>('[data-density]').forEach(button=>button.onclick=()=>{root.querySelectorAll<HTMLElement>('.history-entry').forEach(entry=>setEntry(entry,button.dataset.density==='full'));root.querySelectorAll('[data-density]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));});
const viewer=$<HTMLDialogElement>('.evidence-viewer');let imageOpener:HTMLElement|null=null;
const textScroll=createCaseTouchScroll(copy,{
 enabled:()=>compact()&&!free&&!historyMode&&!viewer.open&&!epilogue.isOpen(),
 scene:()=>index,
 scrollPage:(delta:number)=>window.scrollBy({top:delta,behavior:'instant'})
});
root.querySelectorAll<HTMLElement>('.evidence-image').forEach(button=>button.onclick=()=>{imageOpener=button;viewer.querySelector('img')!.src=button.dataset.src!;viewer.querySelector('img')!.alt=button.dataset.caption!;viewer.querySelector('p')!.textContent=button.dataset.caption!;viewer.showModal();});
$('[data-close-image]').onclick=()=>viewer.close();viewer.onclick=event=>{if(event.target===viewer)viewer.close();};viewer.addEventListener('close',()=>imageOpener?.focus({preventScroll:true}));
window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{sizing();followFocus();});});
window.addEventListener('keydown',event=>{
 if(viewer.open||epilogue.isOpen())return;
 if(free){if(event.key==='Escape')closeFree();return;}
 if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select'))return;
 if(!historyMode&&['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();navigate(index+(event.key==='ArrowRight'?1:-1));}
});
frame.addEventListener('load',()=>frame.contentWindow?.addEventListener('keydown',event=>{if(free&&event.key==='Escape'){event.preventDefault();closeFree();}}));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',layout);
sizing();copyScene();void enter(0);
