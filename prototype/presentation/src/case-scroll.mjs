// Every viewport reserves scroll distance for the complete tour before history.
export function caseScrollGeometry(height,sceneCount,compact=false){
 const step=height*.88;
 const trackHeight=(sceneCount-1)*step+height*(compact?1:1.6);
 return {step,trackHeight,historyStart:compact?trackHeight:trackHeight-height*1.1,sceneCount};
}

export function caseScrollPosition(scrollY,geometry){
 return {
  history:scrollY>=geometry.historyStart,
  index:Math.max(0,Math.min(geometry.sceneCount-1,Math.round(scrollY/geometry.step)))
 };
}
