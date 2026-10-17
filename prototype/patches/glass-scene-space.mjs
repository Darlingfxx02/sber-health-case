// SVG filter primitives use layout pixels. DOM rects use viewport pixels.
// Support positive, axis-aligned ancestor scale/translation (including nesting).
export function createSceneSpace(rect,width,height){
  const sx=rect.width>0&&width>0?rect.width/width:1;
  const sy=rect.height>0&&height>0?rect.height/height:1;
  return {
    sx,sy,
    box:value=>({x:(value.left-rect.left)/sx,y:(value.top-rect.top)/sy,w:value.width/sx,h:value.height/sy}),
    viewport:value=>({left:rect.left+value.x*sx,top:rect.top+value.y*sy,width:value.w*sx,height:value.h*sy})
  };
}
