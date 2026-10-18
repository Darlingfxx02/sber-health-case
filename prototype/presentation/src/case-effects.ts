// Same strokes, arrow geometry and reveal timing as the previous Sber case.
const rectPath=(r:any,radius=0)=>{const d=Math.min(radius,r.width/2,r.height/2);return `M${r.x+d},${r.y}h${r.width-2*d}q${d},0 ${d},${d}v${r.height-2*d}q0,${d} ${-d},${d}h${-r.width+2*d}q${-d},0 ${-d},${-d}v${-r.height+2*d}q0,${-d} ${d},${-d}Z`;};
const attr=(node:Element,key:string,value:string|number)=>{if(node.getAttribute(key)!==String(value))node.setAttribute(key,String(value));};
export function createCaseEffects(stage:HTMLElement){
 const svg=stage.querySelector<SVGSVGElement>('.tour-overlay')!;
 svg.innerHTML=`<defs><marker id="tour-arrowhead" markerWidth="22" markerHeight="22" refX="6" refY="4.5" orient="auto" markerUnits="userSpaceOnUse" viewBox="0 0 9 9"><path d="M2 1.5L6 4.5L2 7.5" fill="none" stroke="#242424" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker><marker id="tour-arrowhead-halo" markerWidth="22" markerHeight="22" refX="6" refY="4.5" orient="auto" markerUnits="userSpaceOnUse" viewBox="0 0 9 9"><path d="M2 1.5L6 4.5L2 7.5" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></marker><clipPath id="tour-screen-clip"><rect data-clip/></clipPath></defs><g clip-path="url(#tour-screen-clip)"><path data-dim fill="#181818" fill-opacity=".23" fill-rule="evenodd"/><g data-outlines/></g><g data-arrows/>`;
 let animations:Animation[]=[];
 const clear=()=>{animations.forEach(a=>a.cancel());animations=[];svg.style.visibility='hidden';};
 clear();
 return {clear,draw(targets:HTMLElement[],screen:HTMLElement,animate=false){
  const s=screen.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
  const scale=s.width/screen.clientWidth;
  const viewport={x:s.x-stageRect.x,y:s.y-stageRect.y,width:s.width,height:s.height};
  const regions=targets.map(target=>{
  const t=target.getBoundingClientRect();
  const x=Math.max(viewport.x,t.x*scale+viewport.x-3),y=Math.max(viewport.y+62*scale,t.y*scale+viewport.y-3);
  const r={x,y,width:Math.max(0,Math.min(viewport.x+viewport.width,t.right*scale+viewport.x+3)-x),height:Math.max(0,Math.min(viewport.y+viewport.height-25*scale,t.bottom*scale+viewport.y+3)-y)};
  const radius=Math.max(9,parseFloat(target.ownerDocument.defaultView!.getComputedStyle(target).borderTopLeftRadius)*scale+3);
  return {r,radius};
  }).filter(({r})=>r.width>=4&&r.height>=4);
  if(!regions.length){clear();return;}
  const outlineLayer=svg.querySelector('[data-outlines]')!,arrowLayer=svg.querySelector('[data-arrows]')!;
  if(outlineLayer.children.length!==regions.length){
    outlineLayer.innerHTML=regions.map(()=>`<g><rect class="tour-outline-halo" fill="none" stroke="white" stroke-width="5.5" pathLength="1"/><rect class="tour-outline" fill="none" stroke="#242424" stroke-width="2" pathLength="1"/></g>`).join('');
    arrowLayer.innerHTML=regions.map(()=>`<g><path class="tour-arrow-halo" fill="none" stroke="white" stroke-width="6.5" stroke-linecap="round" marker-end="url(#tour-arrowhead-halo)" pathLength="1"/><path class="tour-arrow" fill="none" stroke="#242424" stroke-width="2.5" stroke-linecap="round" marker-end="url(#tour-arrowhead)" pathLength="1"/></g>`).join('');
  }
  attr(svg,'viewBox',`0 0 ${stageRect.width} ${stageRect.height}`);
  const clip=svg.querySelector('[data-clip]')!;Object.entries(viewport).forEach(([k,v])=>attr(clip,k,v));attr(clip,'rx',viewport.width*.09);
  attr(svg.querySelector('[data-dim]')!,'d',rectPath(viewport)+regions.map(({r,radius})=>rectPath(r,radius)).join(''));
  regions.forEach(({r,radius},index)=>{
  outlineLayer.children[index].querySelectorAll('.tour-outline,.tour-outline-halo').forEach(node=>{Object.entries(r).forEach(([k,v])=>attr(node,k,v));attr(node,'rx',radius);});
  const endX=r.x+r.width,endY=r.y+Math.min(30,r.height/2),startX=viewport.x+viewport.width+17;
  arrowLayer.children[index].querySelectorAll('.tour-arrow,.tour-arrow-halo').forEach(node=>attr(node,'d',`M${startX},${endY-34} C${startX+13},${endY-13} ${endX+23},${endY} ${endX+3},${endY}`));
  });
  svg.style.visibility='visible';
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){animations.forEach(a=>a.cancel());animations=[...svg.querySelectorAll('.tour-outline,.tour-outline-halo,.tour-arrow,.tour-arrow-halo')].map(node=>node.animate([{strokeDasharray:'1',strokeDashoffset:'1',opacity:0},{strokeDasharray:'1',strokeDashoffset:'0',opacity:1}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'}));}
 }};
}
