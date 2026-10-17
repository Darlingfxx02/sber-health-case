import {useLayoutEffect} from 'react';
import {stableGradientFocus} from '../mascot-lighting.js';

// Move only the focal point inside each fixed radial gradient. The outer colour
// rings, gradientTransform and painted geometry stay anchored to the head.
export function useMascotLighting(ref,x,y,animate){
  useLayoutEffect(()=>{
    const gradients=[...ref.current.querySelectorAll('[data-mascot-light]')].map(node=>{
      const strength=node.dataset.mascotLight==='face-glow'?1.5:.85;
      return {
        node,fromX:Number(node.getAttribute('fx')),fromY:Number(node.getAttribute('fy')),
        toX:x*strength/Number(node.dataset.lightRx),toY:y*strength/Number(node.dataset.lightRy)
      };
    });
    const paint=t=>gradients.forEach(({node,fromX,fromY,toX,toY})=>{
      const focus=stableGradientFocus(fromX+(toX-fromX)*t,fromY+(toY-fromY)*t);
      node.setAttribute('fx',String(focus.fx));
      node.setAttribute('fy',String(focus.fy));
    });
    if(!animate){paint(1);return;}
    if(gradients.every(g=>g.fromX===g.toX&&g.fromY===g.toY))return;
    let frame;const started=performance.now();
    const tick=now=>{
      const t=Math.min(1,(now-started)/650);
      // Matches the eye layer's cubic-bezier(1/3,1,2/3,1).
      paint(1-(1-t)**3);
      if(t<1)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[ref,x,y,animate]);
}
