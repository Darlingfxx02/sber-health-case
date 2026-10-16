let running=null;

export function finishDocumentTransition(){running?.finish();}

// Animate the actual tray, title and sheets. No snapshot layer or replacement nodes.
export function transitionDocuments({device,items,expanded,update}){
  const shell=device.querySelector('.results-block');
  const properties=new Map([
    [shell,['width','height','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','boxShadow','transform']],
    [shell.querySelector('.overview-surface-tint'),['opacity']],
    [shell.querySelector('.overview-toggle'),['height','paddingTop','paddingRight','paddingBottom','paddingLeft']],
    [shell.querySelector('.overview-heading-content'),['left','top','gap']],
    [shell.querySelector('.overview-label'),['fontSize','lineHeight','letterSpacing']],
    [shell.querySelector('.overview-chevron'),['width','height','transform']]
  ]);
  const sheets=items.map(item=>shell.querySelector(`[data-result-id="${item.id}"]`));
  sheets.forEach(sheet=>{
    properties.set(sheet,['left','top','transform','filter']);
    properties.set(sheet.querySelector('img'),['opacity']);
    properties.set(sheet.querySelector('.document-dot'),['width','height']);
  });
  const capture=()=>new Map([...properties].map(([el,keys])=>{const style=getComputedStyle(el);return[el,Object.fromEntries(keys.map(key=>[key,style[key]]))];}));
  // Capture the current visual frame before cancelling, so a rapid reversal does not jump.
  const before=capture();
  finishDocumentTransition();
  update();
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!shell.animate)return;
  device.dataset.overviewAnimating='true';
  const after=capture();
  const speed=1.75;
  const duration=(expanded?480:500)/speed;
  const timing={duration,easing:'cubic-bezier(.32,0,.18,1)',fill:'both'};
  const animations=[];
  let finished=false;
  const run={finish(){if(finished)return;finished=true;for(const animation of animations)animation.cancel();if(running===run){delete device.dataset.overviewAnimating;running=null;}}};
  running=run;
  for(const [element] of properties){
    const start=before.get(element),end=after.get(element);
    if(element.matches('.result-file img')){
      animations.push(element.animate([start,{...start,offset:expanded?.1:.22},end],timing));
    }else animations.push(element.animate([start,end],timing));
  }
  const entering=device.querySelector(expanded?'#chat-panel':'#health-overview');
  animations.push(entering.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:280/speed,delay:(expanded?100:180)/speed,easing:'ease-out',fill:'both'}));
  Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>run.finish());
}
