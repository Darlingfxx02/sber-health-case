export const GOALS = [
  {id:'movement',title:'Сожжено',color:'#F78742',target:600,unit:'ккал',initial:72},
  {id:'distance',title:'Дистанция',color:'#269AE2',target:6,unit:'км',initial:40},
  {id:'nutrition',title:'Съедено',color:'#2FBC90',target:2000,unit:'ккал',initial:65}
];

const clamp = value => Math.min(100,Math.max(0,Number(value)||0));
const linear = value => value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
const srgb = value => Math.round(255*(value<=.0031308?value*12.92:1.055*value**(1/2.4)-.055));
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));

export function activityAppearance(values){
  const progress=GOALS.map((_,i)=>clamp(values[i]));
  const total=progress.reduce((sum,value)=>sum+value,0);
  const average=total/(GOALS.length*100);
  const complete=progress.every(value=>value===100);
  // Each recorded activity contributes one equal share, regardless of its volume.
  const contributors=progress.filter(value=>value>0).length;
  const weights=progress.map(value=>value>0?1/contributors:0);
  const mixed=contributors?[0,1,2].map(channel=>srgb(GOALS.reduce((sum,goal,i)=>sum+linear(rgb(goal.color)[channel]/255)*weights[i],0))):[54,55,66];
  return {
    progress,weights,average,complete,mixed,
    closed:progress.filter(value=>value===100).length,
    // The complete day is a fixed, brighter version of the same single-colour mix.
    intensity:complete?1:contributors?.62+average*.28:.2,
    mixedColor:`rgb(${mixed.join(',')})`
  };
}
