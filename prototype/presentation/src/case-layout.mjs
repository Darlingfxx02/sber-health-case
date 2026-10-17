export const shell={width:1470*402/1318,height:3000*402/1318,x:76*402/1318,y:67*402/1318,screenWidth:402,screenHeight:2866*402/1318};
export function caseLayout(width,height,{compare=false,history=false,free=false}={}){
 const compact=width<1000,ratio=shell.width/shell.height,margin=Math.max(24,(width-1240)/2),content=width-margin*2;
 let phoneWidth,x,y,text;
 if(free){phoneWidth=Math.min(410,width-32,(height-100)*ratio);x=(width-phoneWidth)/2;y=(height-phoneWidth/ratio)/2+16;}
 else if(compact){
   const top=height<650?59:76,phoneHeight=Math.min(420,Math.max(190,height*.47));
   phoneWidth=Math.min(phoneHeight*ratio,compare?(width-52)/2:width-40);x=compare?width/2+10:(width-phoneWidth)/2;y=top;
   text={x:24,y:top+phoneHeight+26,width:width-48,height:Math.max(100,height-(top+phoneHeight+26)-84)};
 } else {
   // Comparison phones share the left lane; the reading column stays anchored.
   phoneWidth=compare?Math.min(260,(height-170)*ratio,(content*.53-64)/2):Math.min(334,(height-175)*ratio);
   x=history?margin+content*.68:compare?margin+phoneWidth+32:margin+content*.14;
   y=(height-phoneWidth/ratio)/2+12;
   text={x:margin+content*.53,y:Math.max(112,height*.16),width:content*.47,height:height-Math.max(112,height*.16)-132};
 }
 return{compact,device:{x,y,width:phoneWidth,height:phoneWidth/ratio,scale:phoneWidth/shell.width},before:{x:compact?width/2-10-phoneWidth:margin,y,width:phoneWidth,height:phoneWidth/ratio,scale:phoneWidth/shell.width},text};
}
