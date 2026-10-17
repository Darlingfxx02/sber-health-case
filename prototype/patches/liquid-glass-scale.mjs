import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Reproducible build-time patch for @glass-sdk/liquid-glass 0.0.2.
// Never mutate node_modules; fail explicitly if upstream implementation changes.
const hashes={
  'dom.js':'5ab6c0b2c064f37b7182648013cde32c5f5020d94130263fc3aee1ff9d8d197b',
  'dom/interaction.js':'3440e9a7fa0bcfe689946fb47f42558d6bbeaf450c879b699bee122dafa8318b',
  'dom/ticker.js':'3049437923af6256763c170876f354cd7b6fb2dc51c6ad9e5e16f7169e18b873'
};
export function patchGlassSource(name,source){
  if(createHash('sha256').update(source).digest('hex')!==hashes[name])throw Error(`Review Liquid Glass scale patch: upstream ${name} changed.`);
  const replace=(before,after)=>{
    if(source.split(before).length!==2)throw Error(`Liquid Glass patch anchor is not unique: ${name}: ${before}`);
    source=source.replace(before,after);
  };
  if(name==='dom.js'){
    source=`import {createSceneSpace as glassSceneSpace} from ${JSON.stringify(fileURLToPath(new URL('./glass-scene-space.mjs',import.meta.url)))};\n${source}`;
    replace('p = z ? z.offsetHeight : o.clientHeight;','p = z ? z.offsetHeight : o.clientHeight;\n\t\tconst glassSpace = glassSceneSpace(d, f, p);');
    replace('width: d.width,\n\t\t\theight: d.height','width: f,\n\t\t\theight: p');
    replace('x: e.left - d.left,\n\t\t\t\ty: e.top - d.top,\n\t\t\t\tw: e.width,\n\t\t\t\th: e.height','...glassSpace.box(e)');
    replace('left: e.left - d.left,\n\t\t\t\t\ttop: e.top - d.top,\n\t\t\t\t\tsx: e.width / (c.element.offsetWidth || e.width || 1),\n\t\t\t\t\tsy: e.height / (c.element.offsetHeight || e.height || 1)',
      'left: (e.left - d.left) / glassSpace.sx,\n\t\t\t\t\ttop: (e.top - d.top) / glassSpace.sy,\n\t\t\t\t\tsx: e.width / glassSpace.sx / (c.element.offsetWidth || 1),\n\t\t\t\t\tsy: e.height / glassSpace.sy / (c.element.offsetHeight || 1)');
    replace('left: Math.min(f.a.x, f.b.x) + d.left','left: Math.min(f.a.x, f.b.x) * glassSpace.sx + d.left');
    replace('top: Math.min(f.a.y, f.b.y) + d.top','top: Math.min(f.a.y, f.b.y) * glassSpace.sy + d.top');
    replace('width: Math.max(f.a.x + f.a.w, f.b.x + f.b.w) - Math.min(f.a.x, f.b.x)','width: (Math.max(f.a.x + f.a.w, f.b.x + f.b.w) - Math.min(f.a.x, f.b.x)) * glassSpace.sx');
    replace('height: Math.max(f.a.y + f.a.h, f.b.y + f.b.h) - Math.min(f.a.y, f.b.y)','height: (Math.max(f.a.y + f.a.h, f.b.y + f.b.h) - Math.min(f.a.y, f.b.y)) * glassSpace.sy');
    replace('m = p.left - d.left, h = p.top - d.top, b = p.width, x = p.height;',
      'm = (p.left - d.left) / glassSpace.sx, h = (p.top - d.top) / glassSpace.sy, b = p.width / glassSpace.sx, x = p.height / glassSpace.sy;');
    replace('x: t.left - d.left,\n\t\t\t\ty: t.top - d.top,\n\t\t\t\tw: t.width,\n\t\t\t\th: t.height','...glassSpace.box(t)');
  }
  if(name==='dom/interaction.js'){
    replace('cx: e.left + e.width / 2 - u.value,\n\t\t\tcy: e.top + e.height / 2 - d.value,','cx: e.left + e.width / 2 - u.value * e.width / t,\n\t\t\tcy: e.top + e.height / 2 - d.value * e.height / n,');
    replace('let { cx: e, cy: n } = T(),','let { cx: e, cy: n, ratioX: glassRX, ratioY: glassRY } = T(),');
    replace('m.clientX - m.x - (e - m.cx) : m.clientX - Math.max(e - s / 2, Math.min(e + s / 2, m.clientX))',
      '(m.clientX - m.x - (e - m.cx)) * glassRX : (m.clientX - Math.max(e - s / glassRX / 2, Math.min(e + s / glassRX / 2, m.clientX))) * glassRX');
    replace('m.clientY - m.y - (n - m.cy) : m.clientY - Math.max(n - c / 2, Math.min(n + c / 2, m.clientY))',
      '(m.clientY - m.y - (n - m.cy)) * glassRY : (m.clientY - Math.max(n - c / glassRY / 2, Math.min(n + c / glassRY / 2, m.clientY))) * glassRY');
    replace('(e - m.lastX) / a - x','(e - m.lastX) * glassRX / a - x');
    replace('(n - m.lastY) / a - S','(n - m.lastY) * glassRY / a - S');
  }
  if(name==='dom/ticker.js'){
    replace('let h = o;',`// Ancestor transforms do not trigger ResizeObserver on the scene.
  const glassAncestors = typeof MutationObserver === "function" ? new MutationObserver(f) : null;
  for (let parent = o.parentElement; parent; parent = parent.parentElement)
    glassAncestors?.observe(parent, {attributes:true, attributeFilter:["style","class"]});
  let h = o;`);
    replace('d.disposed = !0, p?.disconnect(), m?.disconnect();','d.disposed = !0, p?.disconnect(), m?.disconnect(), glassAncestors?.disconnect();');
  }
  return source;
}
export const liquidGlassScalePatch={name:'liquid-glass-ancestor-scale',setup(build){
  build.onLoad({filter:/[/\\]@glass-sdk[/\\]liquid-glass[/\\]dist[/\\](dom\.js|dom[/\\](interaction|ticker)\.js)$/},async args=>{
    const name=args.path.split('/dist/')[1];
    return {contents:patchGlassSource(name,await readFile(args.path,'utf8')),loader:'js',resolveDir:fileURLToPath(new URL('.',`file://${args.path}`)),watchFiles:[fileURLToPath(import.meta.url)]};
  });
}};
